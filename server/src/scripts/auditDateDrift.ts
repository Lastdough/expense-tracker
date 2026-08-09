/**
 * READ-ONLY audit for the local-vs-UTC date drift.
 *
 * A transaction date is a calendar day, and its canonical instant is midnight
 * UTC of that day (`reporting/domain/value-objects/MonthRange.ts`). Before the
 * client was corrected, every date written through the UI was built as *local*
 * midnight and then serialised — so at WIB (UTC+7) it landed on the previous
 * day at 17:00Z, and the server bucketed it into the month before.
 *
 * This script finds rows whose instant is not midnight UTC and reports, for
 * each, the day the server currently reads versus the day the user most likely
 * meant (the local day at OFFSET_HOURS). It writes nothing.
 *
 * Run locally:
 *   pnpm --filter server exec tsx src/scripts/auditDateDrift.ts
 *   pnpm --filter server exec tsx src/scripts/auditDateDrift.ts --offset=7 --limit=50
 * Against the deployed box (the runtime image has no tsx):
 *   node dist/scripts/auditDateDrift.js
 *
 * `--offset` is the UTC offset the rows were written at, in hours (default 7,
 * WIB). Rows already at midnight UTC are correct under any offset and are only
 * counted, never listed.
 *
 * Three columns are audited, all of them calendar days minted by the client:
 * `Expense.transactionDate`, and `Reimbursement.paidAt` / `receivedAt` (the
 * dates picked in the mark-paid / mark-early flows). `createdAt` / `updatedAt`
 * are real instants rather than calendar days and are deliberately excluded.
 */

import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

import { loadConfig } from '../config/env.js';

function createPrismaClient(): PrismaClient {
  const config = loadConfig();
  switch (config.databaseProvider) {
    case 'sqlite':
      return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: config.databaseUrl }) });
    case 'postgres':
      return new PrismaClient({ adapter: new PrismaPg(config.databaseUrl) });
  }
}

const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;

interface Options {
  readonly offsetHours: number;
  readonly limit: number;
}

function parseArgs(argv: ReadonlyArray<string>): Options {
  let offsetHours = 7;
  let limit = 100;
  for (const arg of argv) {
    const offset = /^--offset=(-?\d+(?:\.\d+)?)$/.exec(arg);
    if (offset) offsetHours = Number(offset[1]);
    const lim = /^--limit=(\d+)$/.exec(arg);
    if (lim) limit = Number(lim[1]);
  }
  return { offsetHours, limit };
}

function utcYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Milliseconds past midnight UTC — 0 means the row is already canonical. */
function offsetIntoUtcDay(d: Date): number {
  return ((d.getTime() % MS_PER_DAY) + MS_PER_DAY) % MS_PER_DAY;
}

/**
 * The calendar day the writer most likely meant: shift the instant forward by
 * the offset it was written at, then truncate to the UTC day. A row already at
 * midnight UTC is unchanged by this (00:00 + 7h is still the same day), so the
 * same rule is safe for imported and UI-written rows alike.
 */
function intendedYmd(d: Date, offsetHours: number): string {
  return utcYmd(new Date(d.getTime() + offsetHours * MS_PER_HOUR));
}

interface Row {
  readonly id: string;
  readonly at: Date;
  readonly label: string;
}

function report(title: string, rows: ReadonlyArray<Row>, opts: Options): number {
  const drifted = rows.filter((r) => offsetIntoUtcDay(r.at) !== 0);
  console.log(`\n${title}`);
  console.log(`  total rows          ${rows.length}`);
  console.log(`  at midnight UTC     ${rows.length - drifted.length}`);
  console.log(`  off midnight UTC    ${drifted.length}`);

  const shifted = drifted.filter((r) => intendedYmd(r.at, opts.offsetHours) !== utcYmd(r.at));
  console.log(`  …of which the server reads a DIFFERENT day than intended: ${shifted.length}`);

  if (drifted.length === 0) return 0;

  console.log(
    `\n  ${'id'.padEnd(38)} ${'stored instant'.padEnd(26)} ${'server reads'.padEnd(12)} ${'likely meant'.padEnd(12)}  description`,
  );
  for (const r of drifted.slice(0, opts.limit)) {
    const server = utcYmd(r.at);
    const meant = intendedYmd(r.at, opts.offsetHours);
    const flag = server === meant ? ' ' : '!';
    console.log(
      `${flag} ${r.id.padEnd(38)} ${r.at.toISOString().padEnd(26)} ${server.padEnd(12)} ${meant.padEnd(12)}  ${r.label}`,
    );
  }
  if (drifted.length > opts.limit) {
    console.log(`  … and ${drifted.length - opts.limit} more (raise --limit to see them)`);
  }
  return shifted.length;
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  const prisma = createPrismaClient();
  console.log(
    `Auditing calendar-day drift. Assuming rows were written at UTC+${opts.offsetHours}.`,
  );
  console.log('This script writes nothing.');

  try {
    const expenses = await prisma.expense.findMany({
      select: { id: true, transactionDate: true, description: true },
      orderBy: { transactionDate: 'asc' },
    });
    const reimbursements = await prisma.reimbursement.findMany({
      select: {
        id: true,
        kind: true,
        paidAt: true,
        receivedAt: true,
        expense: { select: { description: true } },
      },
      orderBy: { id: 'asc' },
    });

    const expenseDrift = report(
      'Expense.transactionDate',
      expenses.map((e) => ({ id: e.id, at: e.transactionDate, label: e.description })),
      opts,
    );
    const paidDrift = report(
      'Reimbursement.paidAt',
      reimbursements
        .filter((r): r is typeof r & { paidAt: Date } => r.paidAt !== null)
        .map((r) => ({ id: r.id, at: r.paidAt, label: r.expense.description })),
      opts,
    );
    const receivedDrift = report(
      'Reimbursement.receivedAt',
      reimbursements
        .filter((r): r is typeof r & { receivedAt: Date } => r.receivedAt !== null)
        .map((r) => ({ id: r.id, at: r.receivedAt, label: r.expense.description })),
      opts,
    );

    console.log('\n─────────────────────────────────────────────');
    const total = expenseDrift + paidDrift + receivedDrift;
    if (total === 0) {
      console.log('No row is bucketed into a different day than it was entered as.');
    } else {
      console.log(
        `${total} row(s) marked "!" are read by the server as a different calendar day than\n` +
          `they were most likely entered as. Normalising them means setting the instant to\n` +
          `midnight UTC of the "likely meant" column.`,
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
