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
import { formatMoney } from '../lib/money';

function currentMonthString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y ?? 1970, (m ?? 1) - 1 + by, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function monthBounds(month: string): { startIso: string; endIso: string } {
  const [y, m] = month.split('-').map(Number);
  const start = new Date(y ?? 1970, (m ?? 1) - 1, 1, 0, 0, 0, 0);
  const end = new Date(y ?? 1970, m ?? 1, 0, 23, 59, 59, 999); // last day of month
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}
function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
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
    <div className="min-h-full px-4 py-5 md:px-8 md:py-8">
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      <header className="mb-5 flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold">
            Insights
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-0.5">Dashboard</h1>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMonth((m) => shiftMonth(m, -1))}
            className="p-2 rounded-lg border border-stone-300 hover:bg-stone-50"
            aria-label="Previous month"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="px-3 py-2 text-[13px] font-semibold min-w-32 text-center tabular-nums">
            {monthLabel(month)}
          </div>
          <button
            type="button"
            onClick={() => setMonth((m) => shiftMonth(m, 1))}
            className="p-2 rounded-lg border border-stone-300 hover:bg-stone-50"
            aria-label="Next month"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-stone-400" size={20} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <TotalTile summary={summary} />
          <AvailableBudgetTile available={available} />
          <NetOwedTile netOwed={netOwed} />
          <BreakdownTile
            title="By category"
            rows={(summary?.byCategory ?? []).map((r) => ({
              id: r.categoryId,
              name: r.categoryName,
              bgColor: r.bgColor,
              textColor: r.textColor,
              amountMinor: r.amountMinor,
              count: r.count,
            }))}
            currency={summary?.currency ?? null}
          />
          <BreakdownTile
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
      )}
    </div>
  );
}

function TotalTile({ summary }: { readonly summary: MonthlySummaryView | null }) {
  return (
    <Tile title="This month">
      {summary && summary.total && summary.currency ? (
        <>
          <div className="text-3xl font-bold tracking-tight tabular-nums">
            {formatMoney({ amountMinor: summary.total.amountMinor, currency: summary.currency })}
          </div>
          <div className="text-[12px] text-stone-500 mt-1">
            {summary.expenseCount} expense{summary.expenseCount === 1 ? '' : 's'}
          </div>
        </>
      ) : (
        <EmptyState
          line="No expenses this month yet."
          cta={{ to: '/quick-add', label: 'Add one' }}
        />
      )}
    </Tile>
  );
}

function AvailableBudgetTile({ available }: { readonly available: AvailableBudgetView | null }) {
  const hasBudget = !!available?.monthlyBudget && !!available?.currency;
  if (!available || !hasBudget) {
    return (
      <Tile title="Available budget">
        <EmptyState
          line="No monthly budget set."
          cta={{ to: '/settings?tab=budget', label: 'Set one' }}
        />
      </Tile>
    );
  }
  const amount = available.availableBudget;
  if (!amount || !available.currency) {
    return <Tile title="Available budget">—</Tile>;
  }
  const negative = amount.amountMinor.startsWith('-');
  return (
    <Tile title="Available budget">
      <div
        className={[
          'text-3xl font-bold tracking-tight tabular-nums',
          negative ? 'text-rose-700' : 'text-emerald-700',
        ].join(' ')}
      >
        {formatMoney({ amountMinor: amount.amountMinor, currency: available.currency })}
      </div>
      <div className="text-[12px] text-stone-500 mt-1 tabular-nums">
        budget {formatMoney({
          amountMinor: available.monthlyBudget!.amountMinor,
          currency: available.currency,
        })}
        {' − owed '}
        {available.netOwed
          ? formatMoney({ amountMinor: available.netOwed.amountMinor, currency: available.currency })
          : '0'}
      </div>
    </Tile>
  );
}

function NetOwedTile({ netOwed }: { readonly netOwed: NetOwedView | null }) {
  if (!netOwed?.netOwed || !netOwed.currency) {
    return (
      <Tile title="Net owed">
        <div className="text-[14px] text-stone-500">No reimbursable activity this month.</div>
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
          'text-3xl font-bold tracking-tight tabular-nums',
          negative ? 'text-rose-700' : 'text-stone-900',
        ].join(' ')}
      >
        {formatMoney({ amountMinor: minor, currency: netOwed.currency })}
      </div>
      <div className="text-[12px] text-stone-500 mt-1">{direction}</div>
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

function BreakdownTile({
  title,
  rows,
  currency,
}: {
  readonly title: string;
  readonly rows: ReadonlyArray<BreakdownRow>;
  readonly currency: string | null;
}) {
  if (rows.length === 0 || !currency) {
    return (
      <Tile title={title}>
        <div className="text-[14px] text-stone-500">No data this month.</div>
      </Tile>
    );
  }
  const max = rows.reduce((acc, r) => {
    const n = BigInt(r.amountMinor);
    return n > acc ? n : acc;
  }, 0n);
  return (
    <Tile title={title} wide>
      <ul className="flex flex-col gap-2">
        {rows.map((r) => {
          const width =
            max === 0n ? 0 : Number((BigInt(r.amountMinor) * 1000n) / max) / 10;
          return (
            <li key={r.id} className="flex items-center gap-3">
              <div className="w-32 shrink-0">
                <Chip token={r} size="sm" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
                  <div
                    className="h-full bg-stone-700"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
              <div className="shrink-0 text-[12.5px] font-medium tabular-nums w-28 text-right">
                {formatMoney({ amountMinor: r.amountMinor, currency })}
              </div>
            </li>
          );
        })}
      </ul>
    </Tile>
  );
}

function Tile({
  title,
  children,
  wide,
}: {
  readonly title: string;
  readonly children: React.ReactNode;
  readonly wide?: boolean;
}) {
  return (
    <div
      className={[
        'bg-white rounded-xl border border-line p-5',
        wide ? 'md:col-span-2 lg:col-span-3' : '',
      ].join(' ')}
    >
      <div className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold mb-2">
        {title}
      </div>
      {children}
    </div>
  );
}

function EmptyState({
  line,
  cta,
}: {
  readonly line: string;
  readonly cta?: { readonly to: string; readonly label: string };
}) {
  return (
    <div>
      <div className="text-[14px] text-stone-500">{line}</div>
      {cta && (
        <Link to={cta.to} className="inline-block mt-2 text-stone-900 underline text-[13px]">
          {cta.label}
        </Link>
      )}
    </div>
  );
}
