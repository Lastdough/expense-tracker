// Idempotent seed for the categorization reference data. Re-running this
// inserts missing rows and updates colors / display order on existing rows
// to match the source of truth. Rows the user added outside the seed list
// (or renamed) are left alone.
//
// Run:
//   pnpm --filter server seed
//
// Source of truth for names + colors: CLAUDE.md > Reference data — initial seeds.

import { randomUUID } from 'node:crypto';
import { loadConfig } from './config/env.js';
import { Category } from './contexts/categorization/domain/entities/Category.js';
import { CategoryId } from './contexts/categorization/domain/value-objects/CategoryId.js';
import { Method } from './contexts/categorization/domain/entities/Method.js';
import { MethodId } from './contexts/categorization/domain/value-objects/MethodId.js';
import { ReimbursementStatus } from './contexts/categorization/domain/entities/ReimbursementStatus.js';
import { ReimbursementStatusId } from './contexts/categorization/domain/value-objects/ReimbursementStatusId.js';
import { PrismaCategoryRepository } from './contexts/categorization/infrastructure/persistence/prisma/PrismaCategoryRepository.js';
import { PrismaMethodRepository } from './contexts/categorization/infrastructure/persistence/prisma/PrismaMethodRepository.js';
import { PrismaReimbursementStatusRepository } from './contexts/categorization/infrastructure/persistence/prisma/PrismaReimbursementStatusRepository.js';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

interface SeedRow {
  readonly name: string;
  readonly bgColor: string;
  readonly textColor: string;
}

const CATEGORIES: readonly SeedRow[] = [
  { name: 'Food', bgColor: '#ffcfc9', textColor: '#b10202' },
  { name: 'Transportations', bgColor: '#0a53a8', textColor: '#ffffff' },
  { name: 'Shopping', bgColor: '#e6cff2', textColor: '#5a3286' },
  { name: 'Supplies', bgColor: '#e6cff2', textColor: '#5a3286' },
  { name: 'Groceries', bgColor: '#e6cff2', textColor: '#5a3286' },
  { name: 'Bill', bgColor: '#ffe5a0', textColor: '#473821' },
  { name: 'Services', bgColor: '#ffe5a0', textColor: '#473821' },
  { name: 'Entertainment', bgColor: '#ffe5a0', textColor: '#473821' },
  { name: 'Healthcare', bgColor: '#d4edbc', textColor: '#11734b' },
  { name: 'Misc', bgColor: '#e8eaed', textColor: '#000000' },
];

const METHODS: readonly SeedRow[] = [
  { name: 'Mandiri', bgColor: '#143361', textColor: '#a8c0e0' },
  { name: 'Jago', bgColor: '#fcaf23', textColor: '#6b4400' },
  { name: 'BCA', bgColor: '#046ebc', textColor: '#c0d8f5' },
  { name: 'Gopay', bgColor: '#00accb', textColor: '#e0f7ff' },
  { name: 'ShopeePay', bgColor: '#ef5334', textColor: '#ffffff' },
  { name: 'Cash', bgColor: '#e8eaed', textColor: '#000000' },
];

const REIMBURSEMENT_STATUSES: readonly SeedRow[] = [
  { name: 'Non-Reimbursable', bgColor: '#e8eaed', textColor: '#000000' },
  { name: 'Unpaid Reimbursable', bgColor: '#ffe5a0', textColor: '#473821' },
  { name: 'Paid Reimbursable', bgColor: '#d4edbc', textColor: '#11734b' },
  { name: 'Early Reimbursement', bgColor: '#bce3f2', textColor: '#0b4c6b' },
  { name: 'Pending Reimbursement', bgColor: '#ffc8aa', textColor: '#753800' },
];

function createPrismaClient(): PrismaClient {
  const config = loadConfig();
  switch (config.databaseProvider) {
    case 'sqlite':
      return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: config.databaseUrl }) });
    case 'postgres':
      return new PrismaClient({ adapter: new PrismaPg(config.databaseUrl) });
  }
}

async function seedCategories(prisma: PrismaClient): Promise<void> {
  const repo = new PrismaCategoryRepository(prisma);
  for (const [index, row] of CATEGORIES.entries()) {
    const existing = await repo.findByNormalizedName(Category.normalizeName(row.name));
    if (existing) {
      existing.changeColors({ bgColor: row.bgColor, textColor: row.textColor });
      existing.reorderTo(index);
      await repo.save(existing);
      continue;
    }
    const fresh = Category.create({
      id: CategoryId.create(randomUUID()),
      name: row.name,
      bgColor: row.bgColor,
      textColor: row.textColor,
      displayOrder: index,
    });
    await repo.save(fresh);
  }
  console.log(`[seed] categories: ${CATEGORIES.length} rows ensured`);
}

async function seedMethods(prisma: PrismaClient): Promise<void> {
  const repo = new PrismaMethodRepository(prisma);
  for (const [index, row] of METHODS.entries()) {
    const existing = await repo.findByNormalizedName(Method.normalizeName(row.name));
    if (existing) {
      existing.changeColors({ bgColor: row.bgColor, textColor: row.textColor });
      existing.reorderTo(index);
      await repo.save(existing);
      continue;
    }
    const fresh = Method.create({
      id: MethodId.create(randomUUID()),
      name: row.name,
      bgColor: row.bgColor,
      textColor: row.textColor,
      displayOrder: index,
    });
    await repo.save(fresh);
  }
  console.log(`[seed] methods: ${METHODS.length} rows ensured`);
}

async function seedReimbursementStatuses(prisma: PrismaClient): Promise<void> {
  const repo = new PrismaReimbursementStatusRepository(prisma);
  for (const [index, row] of REIMBURSEMENT_STATUSES.entries()) {
    const existing = await repo.findByNormalizedName(ReimbursementStatus.normalizeName(row.name));
    if (existing) {
      existing.changeColors({ bgColor: row.bgColor, textColor: row.textColor });
      existing.reorderTo(index);
      await repo.save(existing);
      continue;
    }
    const fresh = ReimbursementStatus.create({
      id: ReimbursementStatusId.create(randomUUID()),
      name: row.name,
      bgColor: row.bgColor,
      textColor: row.textColor,
      displayOrder: index,
    });
    await repo.save(fresh);
  }
  console.log(`[seed] reimbursement statuses: ${REIMBURSEMENT_STATUSES.length} rows ensured`);
}

async function main(): Promise<void> {
  const prisma = createPrismaClient();
  try {
    await seedCategories(prisma);
    await seedMethods(prisma);
    await seedReimbursementStatuses(prisma);
    console.log('[seed] done');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
