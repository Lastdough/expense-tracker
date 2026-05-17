import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Filter, Loader2, Search } from 'lucide-react';

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

interface Filters {
  readonly dateStart: string; // YYYY-MM-DD
  readonly dateEnd: string;
  readonly categoryId: string; // id or ALL
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

  // Debounced search input — typed value lives in `qInput`; commits to URL +
  // refetch after 300ms idle. A ref tracks the last committed q so we can skip
  // the timeout when the change came from elsewhere (URL nav, reset).
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

  // Reference data — one-shot.
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

  // Refetch whenever filters change.
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
    <div className="min-h-full px-4 py-5 md:px-8 md:py-8">
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      <header className="mb-4 md:mb-6 flex items-end justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold">
            History
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-0.5">Expenses</h1>
        </div>
        <button
          type="button"
          onClick={() => setFiltersOpen((o) => !o)}
          className="md:hidden flex items-center gap-1.5 px-3 py-2 rounded-lg border border-stone-300 text-[13px] font-medium hover:bg-stone-50"
        >
          <Filter size={14} />
          Filters
        </button>
      </header>

      <FilterBar
        filters={filters}
        refs={refs}
        qInput={qInput}
        setQInput={setQInput}
        onChange={updateFilters}
        open={filtersOpen}
        onReset={() => setParams(new URLSearchParams(), { replace: true })}
      />

      <div className="mt-4 md:mt-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-stone-400" size={20} />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-stone-500">
            <div className="text-[14px]">No expenses match these filters.</div>
            <Link to="/quick-add" className="inline-block mt-3 text-stone-900 underline text-[13px]">
              Add an expense
            </Link>
          </div>
        ) : (
          <>
            <div className="text-[12px] text-stone-500 mb-2">
              Showing {items.length} of {total}
            </div>
            <ExpenseList items={items} refs={refs} />
            {hasMore && (
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={() => void loadMore()}
                  disabled={loadingMore}
                  className="px-4 py-2 rounded-lg border border-stone-300 text-[13px] font-medium hover:bg-stone-50 disabled:opacity-50"
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
    <div className={`${open ? 'block' : 'hidden'} md:block bg-paper-2 rounded-lg p-3 md:p-4`}>
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
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
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
          className="text-[12px] text-stone-500 hover:text-stone-900 underline"
        >
          Reset filters
        </button>
      </div>
      <style>{`
        .filter-input {
          width: 100%;
          padding: 0.5rem 0.875rem;
          border-radius: 0.5rem;
          border: 1px solid #d6d3d1;
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
      <span className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold">
        {label}
      </span>
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
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="filter-input"
    >
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

function ExpenseList({
  items,
  refs,
}: {
  readonly items: ReadonlyArray<ExpenseView>;
  readonly refs: RefData | null;
}) {
  return (
    <ul className="flex flex-col divide-y divide-line">
      {items.map((e) => (
        <li key={e.id}>
          <Link
            to={`/expenses/${e.id}`}
            className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 py-3 hover:bg-paper-2 px-2 -mx-2 rounded-md transition-colors"
          >
            <div className="flex items-center justify-between md:w-40 shrink-0">
              <div className="text-[12px] text-stone-500 tabular-nums">
                {formatTransactionDate(e.transactionDate)}
              </div>
              <div className="md:hidden text-[14px] font-semibold tabular-nums">
                {e.amountFormatted}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-medium truncate">{e.description}</div>
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                <RefChip refs={refs} kind="category" id={e.categoryId} />
                <RefChip refs={refs} kind="method" id={e.methodId} />
                <RefChip refs={refs} kind="status" id={e.reimbursementStatusId} />
              </div>
            </div>
            <div className="hidden md:block text-[14px] font-semibold tabular-nums w-32 text-right">
              {e.amountFormatted}
            </div>
          </Link>
        </li>
      ))}
    </ul>
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

function formatTransactionDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' });
}
