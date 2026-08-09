import {useEffect, useRef, useState} from 'react';
import {Loader2} from 'lucide-react';

import {categoriesApi, methodsApi, statusesApi} from '../api/categorization';
import {expensesApi} from '../api/expenses';
import {ApiError} from '../api/http';
import type {
  CategoryView,
  MethodView,
  ReferenceView,
  ReimbursementStatusView,
} from '../api/types';
import {BottomSheet, useIsMobile} from '../components/BottomSheet';
import {ChipPicker} from '../components/ChipPicker';
import {DatePicker, DateTrigger, fromIso, smartLabel, toIso} from '../components/DatePicker';
import {Popover} from '../components/Popover';
import {ReferenceSelect} from '../components/ReferenceSelect';
import {Toast, type ToastState} from '../components/Toast';
import {longDayLabel, todayYmd, ymdToIso} from '../lib/date';
import {evaluateFormula, type FormulaResult} from '../lib/formulaEvaluator';
import {currencyDecimals, extractRawAmount, formatMoney} from '../lib/money';
import {useFormattedAmount} from '../lib/useFormattedAmount';
import {useLastUsed} from '../lib/useLastUsed';

const CURRENCY = 'IDR'; // changeable in Settings later; per CLAUDE.md the default is IDR
const NON_REIMBURSABLE_NAME = 'Non-Reimbursable';
const NEW_CHIP_DEFAULT_BG = '#e8eaed';
const NEW_CHIP_DEFAULT_TEXT = '#000000';

function longDate(): string {
  return longDayLabel(ymdToIso(todayYmd()));
}

interface ReferenceDataState {
  readonly categories: ReadonlyArray<CategoryView>;
  readonly methods: ReadonlyArray<MethodView>;
  readonly statuses: ReadonlyArray<ReimbursementStatusView>;
}

export default function QuickAdd() {
  const decimals = currencyDecimals(CURRENCY);

  const [refs, setRefs] = useState<ReferenceDataState | null>(null);
  const [refsError, setRefsError] = useState<string | null>(null);

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useLastUsed<string | null>('quickAdd:categoryId', null);
  const [methodId, setMethodId] = useLastUsed<string | null>('quickAdd:methodId', null);
  const [statusId, setStatusId] = useLastUsed<string | null>('quickAdd:statusId', null);
  const [date, setDate] = useLastUsed<string>('quickAdd:date', todayYmd());

  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastIdRef = useRef(0);

  // Live-format the amount field with locale thousand separators. State holds
  // the *displayed* value (e.g. "100.000"); `extractRawAmount` recovers the
  // plain digits before they reach the formula evaluator or the server.
  const amountInput = useFormattedAmount({
    value: amount,
    onChange: setAmount,
    currency: CURRENCY,
  });

  useEffect(() => {
    let cancelled = false;
    Promise.all([categoriesApi.list(), methodsApi.list(), statusesApi.list()])
      .then(([categories, methods, statuses]) => {
        if (cancelled) return;
        setRefs({categories, methods, statuses});
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setRefsError(e instanceof Error ? e.message : 'Failed to load reference data');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Seed defaults once reference data lands. Falls back to first-active when
  // the persisted id has been archived (or never set).
  useEffect(() => {
    if (!refs) return;
    const isActive = <T extends ReferenceView>(arr: ReadonlyArray<T>, id: string | null) =>
      arr.some((c) => c.id === id && !c.isArchived);

    if (!isActive(refs.categories, categoryId)) {
      setCategoryId(refs.categories.find((c) => !c.isArchived)?.id ?? null);
    }
    if (!isActive(refs.methods, methodId)) {
      setMethodId(refs.methods.find((m) => !m.isArchived)?.id ?? null);
    }
    if (!isActive(refs.statuses, statusId)) {
      const def =
        refs.statuses.find((s) => !s.isArchived && s.name === NON_REIMBURSABLE_NAME) ??
        refs.statuses.find((s) => !s.isArchived);
      setStatusId(def?.id ?? null);
    }
  }, [refs, categoryId, methodId, statusId, setCategoryId, setMethodId, setStatusId]);

  const [evalResult, setEvalResult] = useState<FormulaResult | null>(null);
  useEffect(() => {
    if (amount.trim().length === 0) {
      setEvalResult(null);
      return;
    }
    const t = setTimeout(() => {
      // Strip locale separators before the evaluator sees the string —
      // it parses `.` as a decimal point, not a thousands marker.
      setEvalResult(evaluateFormula(extractRawAmount(amount, CURRENCY), decimals));
    }, 150);
    return () => clearTimeout(t);
  }, [amount, decimals]);

  const showToast = (kind: ToastState['kind'], message: string) => {
    toastIdRef.current += 1;
    setToast({id: toastIdRef.current, kind, message});
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
        transactionDate: ymdToIso(date),
        amountInput: extractRawAmount(amount, CURRENCY).trim(),
        description: description.trim(),
        categoryId,
        methodId,
        reimbursementStatusId: statusId,
      });
      setAmount('');
      setDescription('');
      setEvalResult(null);
      showToast('success', 'Expense recorded');
      setTimeout(() => amountInput.ref.current?.focus(), 0);
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Failed to record';
      showToast('error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Inline-create helper for ChipPicker — wraps api.create with default
  // neutral colours; refinement happens in Settings. Each kind has its own
  // closure that appends to the right pool.
  const createCategory = async (name: string): Promise<CategoryView> => {
    const created = await categoriesApi.create({
      name,
      bgColor: NEW_CHIP_DEFAULT_BG,
      textColor: NEW_CHIP_DEFAULT_TEXT,
    });
    setRefs((prev) => (prev ? {...prev, categories: [...prev.categories, created]} : prev));
    return created;
  };
  const createMethod = async (name: string): Promise<MethodView> => {
    const created = await methodsApi.create({
      name,
      bgColor: NEW_CHIP_DEFAULT_BG,
      textColor: NEW_CHIP_DEFAULT_TEXT,
    });
    setRefs((prev) => (prev ? {...prev, methods: [...prev.methods, created]} : prev));
    return created;
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
        <Loader2 className="animate-spin text-ink-3" size={20}/>
      </div>
    );
  }

  // Chip pickers stay in source order — selection is signalled by the halo
  // ring, not by floating the chip to the front. (Reordering on selection
  // made the layout twitch every tap; the design's intent was a stable grid.)
  const STABLE_ORDER: ReadonlyArray<string> = [];

  return (
    <div className="min-h-full flex flex-col">
      <Toast toast={toast} onDismiss={() => setToast(null)}/>

      {/* Header */}
      <header
        className="px-5 md:px-8 pt-5 md:pt-6 pb-4 md:pb-5 border-b border-line flex items-baseline justify-between gap-4 flex-shrink-0">
        <div>
          <div className="text-[11px] md:text-[11.5px] uppercase tracking-wider text-ink-3 font-semibold">
            Quick Add
          </div>
          <h1 className="text-[22px] md:text-[28px] font-bold tracking-tight mt-0.5">
            Record an expense
          </h1>
        </div>
        <div className="hidden md:block text-[12px] text-ink-3">
          Today is <span className="font-semibold text-ink">{longDate()}</span>
        </div>
      </header>

      <form
        className="flex-1 overflow-y-auto px-5 md:px-8 py-5 md:py-6 pb-28 md:pb-24"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div className="max-w-[860px] md:grid md:grid-cols-[1.4fr_1fr] md:gap-6 flex flex-col gap-4">
          {/* LEFT — amount, description, status, date */}
          <div className="flex flex-col gap-4">
            <Section label="Amount">
              <div className="w-full rounded-2xl border-2 border-ink bg-white px-4 md:px-5 py-3 md:py-4 transition">
                <div className="flex items-baseline gap-2 md:gap-3">
                  <span className="text-[14px] md:text-[15px] font-mono text-ink-3">Rp</span>
                  <input
                    id="qa-amount"
                    ref={amountInput.ref}
                    type="text"
                    inputMode="decimal"
                    autoFocus
                    autoComplete="off"
                    value={amount}
                    onChange={amountInput.onChange}
                    placeholder="0"
                    className="flex-1 min-w-0 text-[34px] md:text-[42px] font-mono font-bold tracking-tight leading-none tabular-nums outline-none bg-transparent placeholder:text-ink-3/40"
                  />
                </div>
                {/*<AmountSubline amount={amount} result={evalResult} currency={CURRENCY} />*/}
                {/* Conditionally render AmountSubline only when 'amount' is not empty */}
                {amount && (
                  <AmountSubline amount={amount} result={evalResult} currency={CURRENCY}/>
                )}
              </div>
            </Section>

            <Section label="Description">
              <input
                id="qa-description"
                type="text"
                autoComplete="off"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What was it for?"
                maxLength={280}
                className="w-full px-3.5 md:px-4 py-2.5 md:py-3 rounded-xl border border-line bg-white text-[14px] outline-none focus:border-ink focus:ring-2 focus:ring-ink/10 transition"
              />
            </Section>

            <div className="grid grid-cols-[1.4fr_1fr] gap-3">
              <Section label="Reimbursement">
                <ReferenceSelect
                  api={statusesApi}
                  label=""
                  singular="Status"
                  value={statusId}
                  onChange={setStatusId}
                  items={refs.statuses}
                  onItemsChanged={(next) => setRefs({...refs, statuses: [...next]})}
                />
              </Section>
              <Section label="Date">
                <DateField value={date} onChange={setDate}/>
              </Section>
            </div>
          </div>

          {/* RIGHT — chip pickers */}
          <div className="flex flex-col gap-4">
            <Section label="Category">
              <ChipPicker
                tokens={refs.categories}
                order={STABLE_ORDER}
                value={categoryId}
                onChange={setCategoryId}
                singular="Category"
                onCreate={createCategory}
              />
            </Section>

            <Section label="Method">
              <ChipPicker
                tokens={refs.methods}
                order={STABLE_ORDER}
                value={methodId}
                onChange={setMethodId}
                singular="Method"
                onCreate={createMethod}
              />
            </Section>

            <div
              className="hidden md:block text-[11.5px] text-ink-3 leading-relaxed border-l-2 border-line pl-3 py-1 mt-1">
              <span className="font-semibold text-ink-2">Last-used memory</span> reselects your most
              recent pick on next visit — the order itself stays put. Use{' '}
              <span className="font-mono text-ink-2">+ new</span> to add a chip inline; refine its
              colours in Settings.
            </div>
          </div>
        </div>
      </form>

      {/* Footer save bar — sticky on mobile, in flow on desktop */}
      <div
        className="fixed md:static bottom-16 md:bottom-auto inset-x-0 md:inset-x-auto border-t border-line bg-white md:bg-paper px-5 md:px-8 py-3 md:py-3.5 flex items-center justify-between gap-3 flex-shrink-0 z-10">
        <div className="hidden md:block text-[11.5px] text-ink-3">
          <kbd className="px-1.5 py-0.5 rounded border border-line font-mono text-[10px] mr-1">
            ⏎
          </kbd>
          save & start another
        </div>
        <div className="flex gap-2 flex-1 md:flex-initial md:ml-auto">
          <button
            type="button"
            onClick={() => {
              setAmount('');
              setDescription('');
              setEvalResult(null);
              amountInput.ref.current?.focus();
            }}
            className="flex-[1] md:flex-initial px-4 py-2.5 md:py-2 rounded-xl md:rounded-lg border border-line text-[13px] md:text-[13px] font-semibold text-ink-2 hover:bg-paper-2"
          >
            Clear
          </button>
          <button
            type="submit"
            onClick={(e) => {
              e.preventDefault();
              void submit();
            }}
            disabled={!canSubmit}
            className="flex-[2] md:flex-initial px-5 py-2.5 md:py-2 rounded-xl md:rounded-lg bg-ink text-paper text-[14px] md:text-[13px] font-semibold hover:bg-ink-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Saving…' : 'Save expense'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DateField({
                     value,
                     onChange,
                   }: {
  readonly value: string;
  readonly onChange: (next: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const mobile = useIsMobile();
  const dateObj = fromIso(value);
  const label = smartLabel(dateObj);
  const commit = (d: Date) => {
    onChange(toIso(d));
    setOpen(false);
  };
  const picker = (
    <DatePicker
      mode="single"
      value={dateObj}
      onChange={commit}
      showFooter={!mobile}
      inSheet={mobile}
    />
  );
  return (
    <div ref={anchorRef} className="relative">
      <DateTrigger
        id="qa-date"
        value={label}
        open={open}
        onClick={() => setOpen((v) => !v)}
        variant="md"
      />
      {mobile ? (
        <BottomSheet open={open} onClose={() => setOpen(false)} title="Pick a date">
          {picker}
        </BottomSheet>
      ) : (
        <Popover open={open} anchorRef={anchorRef} onClose={() => setOpen(false)}>
          {picker}
        </Popover>
      )}
    </div>
  );
}

function Section({label, children}: { readonly label: string; readonly children: React.ReactNode }) {
  return (
    <div>
      {label && (
        <div className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold mb-1.5">
          {label}
        </div>
      )}
      {children}
    </div>
  );
}

function AmountSubline({
                         amount,
                         result,
                         currency,
                       }: {
  readonly amount: string;
  readonly result: FormulaResult | null;
  readonly currency: string;
}) {
  // Always reserve a row so the card height doesn't jiggle while typing.
  if (amount.trim().length === 0) {
    return <div className="text-[11px] font-mono text-ink-3 mt-1.5">&nbsp;</div>;
  }
  if (result === null) {
    return <div className="text-[11px] font-mono text-ink-3 mt-1.5">…</div>;
  }
  if (!result.ok) {
    return (
      <div className="text-[11px] font-mono text-rose-600 mt-1.5">
        {amount.startsWith('=') ? amount + ' · invalid' : '= invalid'}
      </div>
    );
  }
  const resolved = formatMoney({amountMinor: result.amountMinor, currency});
  if (amount.startsWith('=')) {
    return (
      <div className="text-[11px] font-mono text-ink-3 mt-1.5">
        {amount}
        <span className="mx-1.5 text-ink-3/60">→</span>
        <span className="text-ink-2 font-semibold tabular-nums">{resolved}</span>
      </div>
    );
  }
  return (
    <div className="text-[11px] font-mono text-ink-3 mt-1.5 tabular-nums">= {resolved}</div>
  );
}
