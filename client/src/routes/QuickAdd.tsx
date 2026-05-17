import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

import { categoriesApi, methodsApi, statusesApi } from '../api/categorization';
import { expensesApi } from '../api/expenses';
import { ApiError } from '../api/http';
import type {
  CategoryView,
  MethodView,
  ReimbursementStatusView,
} from '../api/types';
import { Chip } from '../components/Chip';
import { ReferenceSelect } from '../components/ReferenceSelect';
import { Toast, type ToastState } from '../components/Toast';
import { evaluateFormula, type FormulaResult } from '../lib/formulaEvaluator';
import { currencyDecimals, formatMoney } from '../lib/money';
import { useLastUsed } from '../lib/useLastUsed';

const CURRENCY = 'IDR'; // changeable in Settings later; per CLAUDE.md the default is IDR
const NON_REIMBURSABLE_NAME = 'Non-Reimbursable';

function todayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// HTML date input gives us YYYY-MM-DD; the server expects ISO 8601 with offset.
// Use local midnight on the chosen date so a 2026-05-17 input in Asia/Jakarta
// doesn't round-trip to 2026-05-16 in UTC-leaning code paths.
function dateInputToIso(dateInput: string): string {
  const [y, m, d] = dateInput.split('-').map((n) => Number(n));
  if (!y || !m || !d) return new Date().toISOString();
  return new Date(y, m - 1, d, 0, 0, 0, 0).toISOString();
}

interface ReferenceDataState {
  readonly categories: ReadonlyArray<CategoryView>;
  readonly methods: ReadonlyArray<MethodView>;
  readonly statuses: ReadonlyArray<ReimbursementStatusView>;
}

export default function QuickAdd() {
  const decimals = currencyDecimals(CURRENCY);

  // Reference data.
  const [refs, setRefs] = useState<ReferenceDataState | null>(null);
  const [refsError, setRefsError] = useState<string | null>(null);

  // Form state. Stable fields persist; amount + description always reset.
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useLastUsed<string | null>('quickAdd:categoryId', null);
  const [methodId, setMethodId] = useLastUsed<string | null>('quickAdd:methodId', null);
  const [statusId, setStatusId] = useLastUsed<string | null>('quickAdd:statusId', null);
  const [date, setDate] = useLastUsed<string>('quickAdd:date', todayIso());

  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const amountRef = useRef<HTMLInputElement | null>(null);
  const toastIdRef = useRef(0);

  // Load reference data once.
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      categoriesApi.list(),
      methodsApi.list(),
      statusesApi.list(),
    ])
      .then(([categories, methods, statuses]) => {
        if (cancelled) return;
        setRefs({ categories, methods, statuses });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setRefsError(e instanceof Error ? e.message : 'Failed to load reference data');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Seed defaults from reference data once it arrives. Only sets ids that are
  // unset OR that point at archived/missing items.
  useEffect(() => {
    if (!refs) return;
    const activeCategory = (id: string | null) =>
      refs.categories.some((c) => c.id === id && !c.isArchived);
    const activeMethod = (id: string | null) =>
      refs.methods.some((m) => m.id === id && !m.isArchived);
    const activeStatus = (id: string | null) =>
      refs.statuses.some((s) => s.id === id && !s.isArchived);

    if (!activeCategory(categoryId)) {
      setCategoryId(refs.categories.find((c) => !c.isArchived)?.id ?? null);
    }
    if (!activeMethod(methodId)) {
      setMethodId(refs.methods.find((m) => !m.isArchived)?.id ?? null);
    }
    if (!activeStatus(statusId)) {
      const def =
        refs.statuses.find((s) => !s.isArchived && s.name === NON_REIMBURSABLE_NAME) ??
        refs.statuses.find((s) => !s.isArchived);
      setStatusId(def?.id ?? null);
    }
  }, [refs, categoryId, methodId, statusId, setCategoryId, setMethodId, setStatusId]);

  // Debounced formula evaluation for the live "= 100,000 IDR" display.
  const [evalResult, setEvalResult] = useState<FormulaResult | null>(null);
  useEffect(() => {
    if (amount.trim().length === 0) {
      setEvalResult(null);
      return;
    }
    const t = setTimeout(() => {
      setEvalResult(evaluateFormula(amount, decimals));
    }, 150);
    return () => clearTimeout(t);
  }, [amount, decimals]);

  const showToast = (kind: ToastState['kind'], message: string) => {
    toastIdRef.current += 1;
    setToast({ id: toastIdRef.current, kind, message });
  };

  const canSubmit =
    !submitting &&
    amount.trim().length > 0 &&
    description.trim().length > 0 &&
    !!categoryId &&
    !!methodId &&
    !!statusId &&
    !!date;

  const submit = async () => {
    if (!canSubmit || !categoryId || !methodId || !statusId) return;
    setSubmitting(true);
    try {
      await expensesApi.record({
        transactionDate: dateInputToIso(date),
        amountInput: amount.trim(),
        description: description.trim(),
        categoryId,
        methodId,
        reimbursementStatusId: statusId,
      });
      // Reset transient fields; stable fields stay (last-used memory).
      setAmount('');
      setDescription('');
      setEvalResult(null);
      showToast('success', 'Expense recorded');
      // Refocus amount for the next entry.
      setTimeout(() => amountRef.current?.focus(), 0);
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Failed to record';
      showToast('error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (refsError) {
    return (
      <div className="min-h-full flex items-center justify-center p-6">
        <div className="text-rose-700 text-sm">{refsError}</div>
      </div>
    );
  }
  if (!refs) {
    return (
      <div className="min-h-full flex items-center justify-center p-6">
        <Loader2 className="animate-spin text-stone-400" size={20} />
      </div>
    );
  }

  return (
    <div className="min-h-full px-4 py-5 md:px-8 md:py-8">
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      <header className="mb-5 md:mb-8 max-w-xl mx-auto">
        <div className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold">
          Daily
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-0.5">Quick Add</h1>
        <p className="text-[13px] text-stone-500 mt-1 hidden md:block">
          Amount accepts formulas — try <code className="font-mono text-stone-700">=20000*5</code>.
        </p>
      </header>

      <form
        className="max-w-xl mx-auto flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        {/* AMOUNT */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="qa-amount"
            className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold"
          >
            Amount
          </label>
          <input
            id="qa-amount"
            ref={amountRef}
            type="text"
            inputMode="decimal"
            autoFocus
            autoComplete="off"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="20000 or =20000*5"
            className="w-full px-3.5 py-3 rounded-lg border border-stone-300 bg-white text-[18px] font-medium tabular-nums outline-none focus:border-stone-900 focus:ring-2 focus:ring-stone-900/10"
          />
          <AmountPreview amount={amount} result={evalResult} currency={CURRENCY} />
        </div>

        {/* CATEGORY */}
        <ReferenceSelect
          api={categoriesApi}
          label="Category"
          singular="Category"
          value={categoryId}
          onChange={setCategoryId}
          items={refs.categories}
          onItemsChanged={(next) => setRefs({ ...refs, categories: [...next] })}
        />

        {/* METHOD */}
        <ReferenceSelect
          api={methodsApi}
          label="Method"
          singular="Method"
          value={methodId}
          onChange={setMethodId}
          items={refs.methods}
          onItemsChanged={(next) => setRefs({ ...refs, methods: [...next] })}
        />

        {/* DESCRIPTION */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="qa-description"
            className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold"
          >
            Description
          </label>
          <input
            id="qa-description"
            type="text"
            autoComplete="off"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What was it?"
            maxLength={280}
            className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 bg-white text-[14px] outline-none focus:border-stone-900 focus:ring-2 focus:ring-stone-900/10"
          />
        </div>

        {/* REIMBURSEMENT */}
        <ReferenceSelect
          api={statusesApi}
          label="Reimbursement"
          singular="Status"
          value={statusId}
          onChange={setStatusId}
          items={refs.statuses}
          onItemsChanged={(next) => setRefs({ ...refs, statuses: [...next] })}
        />

        {/* DATE */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="qa-date"
            className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold"
          >
            Date
          </label>
          <input
            id="qa-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 bg-white text-[14px] outline-none focus:border-stone-900 focus:ring-2 focus:ring-stone-900/10"
          />
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="mt-3 py-3 rounded-lg text-[14px] font-semibold text-stone-50 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Saving…' : 'Save expense'}
        </button>
      </form>
    </div>
  );
}

function AmountPreview({
  amount,
  result,
  currency,
}: {
  readonly amount: string;
  readonly result: FormulaResult | null;
  readonly currency: string;
}) {
  if (amount.trim().length === 0) {
    return <span className="text-[12px] text-stone-400 px-1">&nbsp;</span>;
  }
  if (result === null) {
    return <span className="text-[12px] text-stone-400 px-1">…</span>;
  }
  if (result.ok) {
    return (
      <span className="text-[13px] text-stone-700 px-1 font-medium tabular-nums">
        ={' '}
        <Chip
          token={{
            name: formatMoney({ amountMinor: result.amountMinor, currency }),
            bgColor: '#f2efe8',
            textColor: '#0a0908',
          }}
          size="sm"
        />
      </span>
    );
  }
  return <span className="text-[12px] text-stone-400 px-1">= invalid</span>;
}
