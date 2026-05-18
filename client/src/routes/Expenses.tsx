import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Filter, Loader2, Plus, Search } from 'lucide-react';

import { categoriesApi, methodsApi, statusesApi } from '../api/categorization';
import { expensesApi } from '../api/expenses';
import { ApiError } from '../api/http';
import type {
  CategoryView,
  ExpenseView,
  ListExpensesQuery,
  MethodView,
  ReimbursementStatusView,
} from '../api/types';
import { Chip } from '../components/Chip';
import { Toast, type ToastState } from '../components/Toast';
import { formatMoney } from '../lib/money';

const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 300;
const ALL = '__all__';

function localYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function firstOfThisMonthYmd(): string {
  const now = new Date();
  return localYmd(new Date(now.getFullYear(), now.getMonth(), 1));
}
function todayYmd(): string {
  return localYmd(new Date());
}
function ymdToLocalIso(ymd: string, endOfDay: boolean): string {
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) return new Date().toISOString();
  const localDate = endOfDay
    ? new Date(y, m - 1, d, 23, 59, 59, 999)
    : new Date(y, m - 1, d, 0, 0, 0, 0);
  return localDate.toISOString();
}

const DOW_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function shortDate(iso: string): string {
  const d = new Date(iso);
  return `${DOW_SHORT[d.getDay()]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}
function longDate(iso: string): string {
  const d = new Date(iso);
  return `${DOW_SHORT[d.getDay()]}, ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}
function localYmdFromIso(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface Filters {
  readonly dateStart: string;
  readonly dateEnd: string;
  readonly categoryId: string;
  readonly methodId: string;
  readonly statusId: string;
  readonly q: string;
}

function defaultFilters(): Filters {
  return {
    dateStart: firstOfThisMonthYmd(),
    dateEnd: todayYmd(),
    categoryId: ALL,
    methodId: ALL,
    statusId: ALL,
    q: '',
  };
}

function filtersFromParams(p: URLSearchParams): Filters {
  const d = defaultFilters();
  return {
    dateStart: p.get('dateStart') ?? d.dateStart,
    dateEnd: p.get('dateEnd') ?? d.dateEnd,
    categoryId: p.get('categoryId') ?? ALL,
    methodId: p.get('methodId') ?? ALL,
    statusId: p.get('statusId') ?? ALL,
    q: p.get('q') ?? '',
  };
}

function filtersToParams(f: Filters): URLSearchParams {
  const p = new URLSearchParams();
  const d = defaultFilters();
  if (f.dateStart !== d.dateStart) p.set('dateStart', f.dateStart);
  if (f.dateEnd !== d.dateEnd) p.set('dateEnd', f.dateEnd);
  if (f.categoryId !== ALL) p.set('categoryId', f.categoryId);
  if (f.methodId !== ALL) p.set('methodId', f.methodId);
  if (f.statusId !== ALL) p.set('statusId', f.statusId);
  if (f.q.trim()) p.set('q', f.q.trim());
  return p;
}

function filtersToQuery(f: Filters, limit: number, offset: number): ListExpensesQuery {
  return {
    dateStart: ymdToLocalIso(f.dateStart, false),
    dateEnd: ymdToLocalIso(f.dateEnd, true),
    ...(f.categoryId !== ALL ? { categoryId: f.categoryId } : {}),
    ...(f.methodId !== ALL ? { methodId: f.methodId } : {}),
    ...(f.statusId !== ALL ? { reimbursementStatusId: f.statusId } : {}),
    ...(f.q.trim() ? { descriptionQuery: f.q.trim() } : {}),
    limit,
    offset,
  };
}

interface RefData {
  readonly categories: ReadonlyArray<CategoryView>;
  readonly methods: ReadonlyArray<MethodView>;
  readonly statuses: ReadonlyArray<ReimbursementStatusView>;
}

const TABLE_GRID = '110px minmax(0,1.6fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) 130px';

export default function Expenses() {
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => filtersFromParams(params), [params]);

  const [refs, setRefs] = useState<RefData | null>(null);
  const [items, setItems] = useState<ReadonlyArray<ExpenseView>>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastIdRef = useRef(0);

  const showToast = useCallback((kind: ToastState['kind'], message: string) => {
    toastIdRef.current += 1;
    setToast({ id: toastIdRef.current, kind, message });
  }, []);

  const updateFilters = useCallback(
    (patch: Partial<Filters>) => {
      const next = { ...filters, ...patch };
      setParams(filtersToParams(next), { replace: true });
    },
    [filters, setParams],
  );

  const [qInput, setQInput] = useState(filters.q);
  const lastCommittedQ = useRef(filters.q);
  useEffect(() => {
    if (filters.q !== lastCommittedQ.current) {
      setQInput(filters.q);
      lastCommittedQ.current = filters.q;
    }
  }, [filters.q]);
  useEffect(() => {
    if (qInput === lastCommittedQ.current) return;
    const t = setTimeout(() => {
      lastCommittedQ.current = qInput;
      updateFilters({ q: qInput });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [qInput, updateFilters]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      categoriesApi.list({ includeArchived: true }),
      methodsApi.list({ includeArchived: true }),
      statusesApi.list({ includeArchived: true }),
    ])
      .then(([categories, methods, statuses]) => {
        if (cancelled) return;
        setRefs({ categories, methods, statuses });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        showToast('error', e instanceof Error ? e.message : 'Failed to load reference data');
      });
    return () => {
      cancelled = true;
    };
  }, [showToast]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    expensesApi
      .list(filtersToQuery(filters, PAGE_SIZE, 0))
      .then((res) => {
        if (cancelled) return;
        setItems(res.items);
        setTotal(res.total);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        showToast('error', e instanceof ApiError ? e.message : 'Failed to load expenses');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filters, showToast]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const res = await expensesApi.list(filtersToQuery(filters, PAGE_SIZE, items.length));
      setItems((prev) => [...prev, ...res.items]);
      setTotal(res.total);
    } catch (e) {
      showToast('error', e instanceof ApiError ? e.message : 'Failed to load more');
    } finally {
      setLoadingMore(false);
    }
  };

  const hasMore = items.length < total;

  return (
    <div className="min-h-full flex flex-col">
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      {/* Header */}
      <header className="px-5 md:px-8 pt-5 md:pt-6 pb-4 md:pb-5 border-b border-line flex items-baseline justify-between gap-3 flex-shrink-0">
        <div>
          <div className="text-[11px] md:text-[11.5px] uppercase tracking-wider text-ink-3 font-semibold">
            Expenses
          </div>
          <h1 className="text-[22px] md:text-[28px] font-bold tracking-tight mt-0.5">
            All expenses
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFiltersOpen((o) => !o)}
            className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-full border border-line text-ink-2 hover:bg-paper-2"
            aria-label="Filters"
          >
            <Filter size={14} />
          </button>
          <button
            type="button"
            onClick={() => setFiltersOpen((o) => !o)}
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line bg-white text-[12.5px] font-medium text-ink-2 hover:border-ink-3"
          >
            <Filter size={13} />
            {filtersOpen ? 'Hide filters' : 'Filters'}
          </button>
          <Link
            to="/quick-add"
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ink text-paper text-[12.5px] font-semibold hover:bg-ink-2"
          >
            <Plus size={13} />
            New
          </Link>
        </div>
      </header>

      {/* Summary row */}
      <div className="px-5 md:px-8 py-2.5 md:py-3 border-b border-line bg-paper-2/60 flex items-center gap-3 md:gap-5 text-[12px] flex-shrink-0">
        <div>
          <span className="text-ink-3">
            {loading ? 'Loading…' : `${total} expense${total === 1 ? '' : 's'}`}
          </span>
          {!loading && items.length < total && (
            <>
              <span className="mx-2 text-ink-3/60">·</span>
              <span className="text-ink-3">showing {items.length}</span>
            </>
          )}
        </div>
      </div>

      <FilterBar
        filters={filters}
        refs={refs}
        qInput={qInput}
        setQInput={setQInput}
        onChange={updateFilters}
        open={filtersOpen}
        onReset={() => setParams(new URLSearchParams(), { replace: true })}
      />

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-ink-3" size={20} />
          </div>
        ) : items.length === 0 ? (
          <EmptyState onReset={() => setParams(new URLSearchParams(), { replace: true })} />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <div
                className="grid px-8 py-2 text-[10.5px] uppercase tracking-wider text-ink-3 font-semibold border-b border-line sticky top-0 z-10 bg-paper"
                style={{ gridTemplateColumns: TABLE_GRID }}
              >
                <div>Date</div>
                <div>Description</div>
                <div>Category</div>
                <div>Method</div>
                <div>Status</div>
                <div className="text-right">Amount</div>
              </div>
              {items.map((e) => (
                <DesktopRow key={e.id} expense={e} refs={refs} />
              ))}
            </div>

            {/* Mobile grouped-by-day */}
            <div className="md:hidden">
              <MobileGrouped items={items} refs={refs} />
            </div>

            {hasMore && (
              <div className="py-5 flex justify-center">
                <button
                  type="button"
                  onClick={() => void loadMore()}
                  disabled={loadingMore}
                  className="px-4 py-2 rounded-lg border border-line text-[13px] font-medium hover:bg-paper-2 disabled:opacity-50"
                >
                  {loadingMore ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function DesktopRow({
  expense: e,
  refs,
}: {
  readonly expense: ExpenseView;
  readonly refs: RefData | null;
}) {
  return (
    <Link
      to={`/expenses/${e.id}`}
      className="grid items-center px-8 py-2.5 border-b border-line/60 text-[13px] hover:bg-paper-2/60 transition"
      style={{ gridTemplateColumns: TABLE_GRID }}
    >
      <div className="text-ink-3 font-mono text-[12px]">{shortDate(e.transactionDate)}</div>
      <div className="font-medium text-ink truncate pr-3">{e.description}</div>
      <div>
        <RefChip refs={refs} kind="category" id={e.categoryId} />
      </div>
      <div>
        <RefChip refs={refs} kind="method" id={e.methodId} />
      </div>
      <div>
        <RefChip refs={refs} kind="status" id={e.reimbursementStatusId} />
      </div>
      <div className="text-right font-mono font-semibold tabular-nums">
        {formatMoney({ amountMinor: e.amountMinor, currency: e.currency })}
      </div>
    </Link>
  );
}

function MobileGrouped({
  items,
  refs,
}: {
  readonly items: ReadonlyArray<ExpenseView>;
  readonly refs: RefData | null;
}) {
  // Group by local YYYY-MM-DD derived from the transaction date.
  const groups = useMemo(() => {
    const m = new Map<string, ExpenseView[]>();
    for (const e of items) {
      const key = localYmdFromIso(e.transactionDate);
      const arr = m.get(key) ?? [];
      arr.push(e);
      m.set(key, arr);
    }
    return Array.from(m.entries()); // preserves insertion order (server sorts desc)
  }, [items]);

  return (
    <div>
      {groups.map(([ymd, rows]) => {
        const dayTotalMinor = rows.reduce((acc, e) => acc + BigInt(e.amountMinor), 0n);
        const currency = rows[0]?.currency ?? 'IDR';
        return (
          <div key={ymd}>
            <div className="px-5 pt-4 pb-1.5 flex items-baseline justify-between">
              <div className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold">
                {longDate(`${ymd}T00:00:00`)}
              </div>
              <div className="text-[11px] font-mono text-ink-3 tabular-nums">
                {formatMoney({ amountMinor: dayTotalMinor.toString(), currency })}
              </div>
            </div>
            <div className="px-3 flex flex-col gap-1">
              {rows.map((e) => (
                <Link
                  key={e.id}
                  to={`/expenses/${e.id}`}
                  className="w-full text-left px-2.5 py-2.5 rounded-xl hover:bg-paper-2 active:bg-paper-2 transition"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-[13.5px] font-medium text-ink truncate">
                        {e.description}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <RefChip refs={refs} kind="category" id={e.categoryId} />
                        <RefChip refs={refs} kind="method" id={e.methodId} />
                        <RefChip refs={refs} kind="status" id={e.reimbursementStatusId} />
                      </div>
                    </div>
                    <div className="font-mono text-[14px] font-semibold tabular-nums whitespace-nowrap">
                      {formatMoney({ amountMinor: e.amountMinor, currency: e.currency })}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EmptyState({ onReset }: { readonly onReset: () => void }) {
  return (
    <div className="text-center py-16 px-6">
      <div className="text-[14px] text-ink-3">No expenses match these filters.</div>
      <div className="mt-3 flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={onReset}
          className="text-[13px] text-ink-2 underline hover:text-ink"
        >
          Reset filters
        </button>
        <span className="text-ink-3/60">·</span>
        <Link to="/quick-add" className="text-[13px] text-ink underline hover:text-ink-2">
          Add an expense
        </Link>
      </div>
    </div>
  );
}

interface FilterBarProps {
  readonly filters: Filters;
  readonly refs: RefData | null;
  readonly qInput: string;
  readonly setQInput: (q: string) => void;
  readonly onChange: (patch: Partial<Filters>) => void;
  readonly open: boolean;
  readonly onReset: () => void;
}

function FilterBar({ filters, refs, qInput, setQInput, onChange, open, onReset }: FilterBarProps) {
  return (
    <div
      className={`${open ? 'block' : 'hidden'} border-b border-line bg-paper-2/40 px-5 md:px-8 py-4 flex-shrink-0`}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <FieldWrap label="From">
          <input
            type="date"
            value={filters.dateStart}
            onChange={(e) => onChange({ dateStart: e.target.value })}
            className="filter-input"
          />
        </FieldWrap>
        <FieldWrap label="To">
          <input
            type="date"
            value={filters.dateEnd}
            onChange={(e) => onChange({ dateEnd: e.target.value })}
            className="filter-input"
          />
        </FieldWrap>
        <FieldWrap label="Search">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
            <input
              type="text"
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Description…"
              className="filter-input pl-8"
            />
          </div>
        </FieldWrap>
        <FieldWrap label="Category">
          <FilterSelect
            value={filters.categoryId}
            onChange={(v) => onChange({ categoryId: v })}
            options={refs?.categories ?? []}
            allLabel="All categories"
          />
        </FieldWrap>
        <FieldWrap label="Method">
          <FilterSelect
            value={filters.methodId}
            onChange={(v) => onChange({ methodId: v })}
            options={refs?.methods ?? []}
            allLabel="All methods"
          />
        </FieldWrap>
        <FieldWrap label="Reimbursement">
          <FilterSelect
            value={filters.statusId}
            onChange={(v) => onChange({ statusId: v })}
            options={refs?.statuses ?? []}
            allLabel="All statuses"
          />
        </FieldWrap>
      </div>
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={onReset}
          className="text-[12px] text-ink-3 hover:text-ink underline"
        >
          Reset filters
        </button>
      </div>
      <style>{`
        .filter-input {
          width: 100%;
          padding: 0.5rem 0.875rem;
          border-radius: 0.5rem;
          border: 1px solid #e3ddd0;
          background: white;
          font-size: 13px;
          outline: none;
        }
        .filter-input:focus {
          border-color: #0a0908;
          box-shadow: 0 0 0 2px rgb(10 9 8 / 0.1);
        }
      `}</style>
    </div>
  );
}

function FieldWrap({ label, children }: { readonly label: string; readonly children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider text-ink-3 font-semibold">{label}</span>
      {children}
    </label>
  );
}

interface RefOption {
  readonly id: string;
  readonly name: string;
  readonly isArchived: boolean;
}

function FilterSelect({
  value,
  onChange,
  options,
  allLabel,
}: {
  readonly value: string;
  readonly onChange: (v: string) => void;
  readonly options: ReadonlyArray<RefOption>;
  readonly allLabel: string;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="filter-input">
      <option value={ALL}>{allLabel}</option>
      {options
        .filter((o) => !o.isArchived || o.id === value)
        .map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
            {o.isArchived ? ' (archived)' : ''}
          </option>
        ))}
    </select>
  );
}

function RefChip({
  refs,
  kind,
  id,
}: {
  readonly refs: RefData | null;
  readonly kind: 'category' | 'method' | 'status';
  readonly id: string;
}) {
  if (!refs) return null;
  const pool =
    kind === 'category' ? refs.categories : kind === 'method' ? refs.methods : refs.statuses;
  const found = pool.find((p) => p.id === id);
  if (!found) return null;
  return <Chip token={found} size="sm" />;
}
