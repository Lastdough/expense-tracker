import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

import { ApiError } from '../api/http';
import { reportingApi } from '../api/reporting';
import type {
  AvailableBudgetView,
  MonthlySummaryView,
  NetOwedView,
} from '../api/types';
import { Chip } from '../components/Chip';
import { Toast, type ToastState } from '../components/Toast';
import { formatYmd, todayYmd } from '../lib/date';
import { formatMoney } from '../lib/money';

// Month bounds are built in UTC to match the server's `MonthRange`; a local
// bound sends a start seven hours before the month begins at WIB, so an
// expense dated the 1st lands in the previous bucket. See lib/date.ts.
function currentMonthString(): string {
  // The local clock decides which month the user is *in* — same reasoning as
  // `todayYmd`. Only bounds derived from the label are UTC.
  return todayYmd().slice(0, 7);
}
function parseMonth(month: string): { y: number; m: number } {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month) ?? /^(\d{4})-(\d{2})$/.exec(currentMonthString());
  if (!match) return { y: 1970, m: 1 };
  return { y: Number(match[1]), m: Number(match[2]) };
}
// Pure ordinal arithmetic, no `Date`, so no timezone can influence the result.
function shiftMonth(month: string, by: number): string {
  const p = parseMonth(month);
  const ordinal = p.y * 12 + (p.m - 1) + by;
  const y = Math.floor(ordinal / 12);
  const m = ordinal - y * 12 + 1;
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}`;
}
/** Half-open UTC range [first-of-month, first-of-next-month). */
function monthBounds(month: string): { startIso: string; endIso: string } {
  const p = parseMonth(month);
  return {
    startIso: new Date(Date.UTC(p.y, p.m - 1, 1)).toISOString(),
    endIso: new Date(Date.UTC(p.y, p.m, 1)).toISOString(),
  };
}
function monthLabel(month: string): string {
  return formatYmd(`${month}-01`, { month: 'long', year: 'numeric' });
}

export default function Dashboard() {
  const [month, setMonth] = useState(currentMonthString());
  const [summary, setSummary] = useState<MonthlySummaryView | null>(null);
  const [available, setAvailable] = useState<AvailableBudgetView | null>(null);
  const [netOwed, setNetOwed] = useState<NetOwedView | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const { startIso, endIso } = monthBounds(month);
    Promise.all([
      reportingApi.monthlySummary(month).catch((e: unknown) => err('summary', e)),
      reportingApi.availableBudget(month).catch((e: unknown) => err('budget', e)),
      reportingApi.netOwed(startIso, endIso).catch((e: unknown) => err('owed', e)),
    ])
      .then(([s, a, n]) => {
        if (cancelled) return;
        setSummary(s as MonthlySummaryView | null);
        setAvailable(a as AvailableBudgetView | null);
        setNetOwed(n as NetOwedView | null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    function err(_which: string, e: unknown): null {
      const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Failed';
      setToast({ id: Date.now(), kind: 'error', message: msg });
      return null;
    }
  }, [month]);

  return (
    <div className="min-h-full flex flex-col">
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      {/* Header */}
      <header className="px-5 md:px-8 pt-5 md:pt-6 pb-4 md:pb-5 border-b border-line flex items-baseline justify-between gap-3 flex-shrink-0">
        <div>
          <div className="text-[11px] md:text-[11.5px] uppercase tracking-wider text-ink-3 font-semibold">
            Insights
          </div>
          <h1 className="text-[22px] md:text-[28px] font-bold tracking-tight mt-0.5">
            Dashboard
          </h1>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMonth((m) => shiftMonth(m, -1))}
            className="p-2 rounded-lg border border-line hover:bg-paper-2"
            aria-label="Previous month"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="px-3 py-2 text-[13px] font-semibold min-w-[8.5rem] text-center tabular-nums">
            {monthLabel(month)}
          </div>
          <button
            type="button"
            onClick={() => setMonth((m) => shiftMonth(m, 1))}
            className="p-2 rounded-lg border border-line hover:bg-paper-2"
            aria-label="Next month"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-ink-3" size={20} />
          </div>
        ) : (
          <>
            <Hero summary={summary} />
            <div className="px-5 md:px-10 py-5 md:py-6 grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
              <AvailableBudgetTile available={available} />
              <NetOwedTile netOwed={netOwed} />
              <ThisMonthTile summary={summary} />
            </div>
            <div className="px-5 md:px-10 pb-8 md:pb-10">
              <BreakdownCard
                title="By method"
                rows={(summary?.byMethod ?? []).map((r) => ({
                  id: r.methodId,
                  name: r.methodName,
                  bgColor: r.bgColor,
                  textColor: r.textColor,
                  amountMinor: r.amountMinor,
                  count: r.count,
                }))}
                currency={summary?.currency ?? null}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Hero({ summary }: { readonly summary: MonthlySummaryView | null }) {
  if (!summary || !summary.total || !summary.currency) {
    return (
      <div
        className="px-5 md:px-10 pt-6 md:pt-10 pb-6 md:pb-8"
        style={{ background: 'linear-gradient(180deg, #f2efe8 0%, #fafaf7 100%)' }}
      >
        <div className="text-[11px] md:text-[11.5px] uppercase tracking-wider text-ink-3 font-semibold">
          This month
        </div>
        <div className="mt-2 text-[14px] text-ink-3">No expenses this month yet.</div>
        <Link
          to="/quick-add"
          className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-lg bg-ink text-paper text-[12.5px] font-semibold hover:bg-ink-2"
        >
          Record one
        </Link>
      </div>
    );
  }

  const totalRupiah = formatMoney({
    amountMinor: summary.total.amountMinor,
    currency: summary.currency,
  }).replace(/^Rp\s*/, '');

  const byCat = summary.byCategory.filter((c) => BigInt(c.amountMinor) > 0n);
  const totalMinor = byCat.reduce((acc, c) => acc + BigInt(c.amountMinor), 0n);

  return (
    <div
      className="px-5 md:px-10 pt-6 md:pt-10 pb-6 md:pb-8"
      style={{ background: 'linear-gradient(180deg, #f2efe8 0%, #fafaf7 100%)' }}
    >
      <div className="text-[11px] md:text-[11.5px] uppercase tracking-wider text-ink-3 font-semibold">
        This month
      </div>
      <div className="flex items-baseline gap-2 md:gap-3 mt-1">
        <span className="font-mono text-[16px] md:text-[20px] text-ink-3">Rp</span>
        <span className="font-mono text-[44px] md:text-[80px] font-bold tracking-[-0.02em] leading-none tabular-nums">
          {totalRupiah}
        </span>
      </div>
      <div className="mt-2 text-[12.5px] md:text-[13px] text-ink-2">
        across{' '}
        <b className="text-ink">
          {summary.expenseCount} expense{summary.expenseCount === 1 ? '' : 's'}
        </b>{' '}
        in <b className="text-ink">{byCat.length} categor{byCat.length === 1 ? 'y' : 'ies'}</b>
      </div>

      {byCat.length > 0 && (
        <div className="mt-4 md:mt-5">
          <div className="flex rounded-md overflow-hidden h-2.5 md:h-3 border border-line">
            {byCat.map((c) => (
              <div
                key={c.categoryId}
                title={`${c.categoryName} · ${formatMoney({
                  amountMinor: c.amountMinor,
                  currency: summary.currency!,
                })}`}
                style={{
                  background: c.bgColor,
                  width: `${(Number(BigInt(c.amountMinor) * 1000n / (totalMinor === 0n ? 1n : totalMinor)) / 10).toFixed(2)}%`,
                }}
              />
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {byCat.map((c) => (
              <div key={c.categoryId} className="inline-flex items-center gap-1.5 text-[11px]">
                <Chip
                  token={{ name: c.categoryName, bgColor: c.bgColor, textColor: c.textColor }}
                  size="sm"
                />
                <span className="font-mono text-ink-2 tabular-nums">
                  {formatMoney({ amountMinor: c.amountMinor, currency: summary.currency! })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Tile({
  title,
  children,
}: {
  readonly title: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <div className="text-[10.5px] uppercase tracking-wider text-ink-3 font-semibold">{title}</div>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function ThisMonthTile({ summary }: { readonly summary: MonthlySummaryView | null }) {
  if (!summary || !summary.total || !summary.currency) {
    return (
      <Tile title="This month total">
        <EmptyStateLine
          line="No expenses yet."
          cta={{ to: '/quick-add', label: 'Record one' }}
        />
      </Tile>
    );
  }
  return (
    <Tile title="This month total">
      <div className="font-mono text-[24px] md:text-[26px] font-bold tracking-tight tabular-nums">
        {formatMoney({ amountMinor: summary.total.amountMinor, currency: summary.currency })}
      </div>
      <div className="text-[11.5px] text-ink-3 mt-1">
        {summary.expenseCount} expense{summary.expenseCount === 1 ? '' : 's'} recorded
      </div>
    </Tile>
  );
}

function AvailableBudgetTile({ available }: { readonly available: AvailableBudgetView | null }) {
  const hasBudget = !!available?.monthlyBudget && !!available?.currency;
  if (!available || !hasBudget) {
    return (
      <Tile title="Available budget">
        <EmptyStateLine
          line="No monthly budget set."
          cta={{ to: '/settings?tab=budget', label: 'Set one' }}
        />
      </Tile>
    );
  }
  const amount = available.availableBudget;
  if (!amount || !available.currency) return <Tile title="Available budget">—</Tile>;
  const negative = amount.amountMinor.startsWith('-');
  return (
    <Tile title="Available budget">
      <div
        className={[
          'font-mono text-[24px] md:text-[26px] font-bold tracking-tight tabular-nums',
          negative ? 'text-rose-700' : 'text-emerald-700',
        ].join(' ')}
      >
        {formatMoney({ amountMinor: amount.amountMinor, currency: available.currency })}
      </div>
      <div className="text-[11.5px] text-ink-3 mt-1 tabular-nums">
        budget{' '}
        {formatMoney({
          amountMinor: available.monthlyBudget!.amountMinor,
          currency: available.currency,
        })}
        {' − owed '}
        {available.netOwed
          ? formatMoney({
              amountMinor: available.netOwed.amountMinor,
              currency: available.currency,
            })
          : '0'}
      </div>
    </Tile>
  );
}

function NetOwedTile({ netOwed }: { readonly netOwed: NetOwedView | null }) {
  if (!netOwed?.netOwed || !netOwed.currency) {
    return (
      <Tile title="Net owed">
        <div className="text-[13px] text-ink-3">No reimbursable activity this month.</div>
      </Tile>
    );
  }
  const minor = netOwed.netOwed.amountMinor;
  const negative = minor.startsWith('-');
  const direction = negative ? 'You owe' : 'Owed to you';
  return (
    <Tile title="Net owed">
      <div
        className={[
          'font-mono text-[24px] md:text-[26px] font-bold tracking-tight tabular-nums',
          negative ? 'text-rose-700' : 'text-ink',
        ].join(' ')}
      >
        {formatMoney({ amountMinor: minor, currency: netOwed.currency })}
      </div>
      <div className="text-[11.5px] text-ink-3 mt-1">{direction}</div>
    </Tile>
  );
}

interface BreakdownRow {
  readonly id: string;
  readonly name: string;
  readonly bgColor: string;
  readonly textColor: string;
  readonly amountMinor: string;
  readonly count: number;
}

function BreakdownCard({
  title,
  rows,
  currency,
}: {
  readonly title: string;
  readonly rows: ReadonlyArray<BreakdownRow>;
  readonly currency: string | null;
}) {
  if (rows.length === 0 || !currency) return null;
  const max = rows.reduce((acc, r) => {
    const n = BigInt(r.amountMinor);
    return n > acc ? n : acc;
  }, 0n);
  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <div className="text-[10.5px] uppercase tracking-wider text-ink-3 font-semibold mb-3">
        {title}
      </div>
      <ul className="flex flex-col gap-2">
        {rows.map((r) => {
          const width = max === 0n ? 0 : Number((BigInt(r.amountMinor) * 1000n) / max) / 10;
          return (
            <li key={r.id} className="flex items-center gap-3">
              <div className="w-28 md:w-32 shrink-0">
                <Chip token={r} size="sm" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="h-1.5 rounded-full bg-paper-2 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ background: r.bgColor, width: `${width}%` }}
                  />
                </div>
              </div>
              <div className="shrink-0 text-[12px] font-medium tabular-nums w-24 md:w-28 text-right text-ink-2">
                {formatMoney({ amountMinor: r.amountMinor, currency })}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function EmptyStateLine({
  line,
  cta,
}: {
  readonly line: string;
  readonly cta?: { readonly to: string; readonly label: string };
}) {
  return (
    <div>
      <div className="text-[13px] text-ink-3">{line}</div>
      {cta && (
        <Link to={cta.to} className="inline-block mt-2 text-ink underline text-[12.5px]">
          {cta.label}
        </Link>
      )}
    </div>
  );
}
