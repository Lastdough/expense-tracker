import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Trash2, X } from 'lucide-react';

import { categoriesApi, methodsApi, statusesApi } from '../api/categorization';
import { expensesApi } from '../api/expenses';
import { ApiError } from '../api/http';
import { reimbursementsApi } from '../api/reimbursements';
import type {
  CategoryView,
  EditExpenseInput,
  ExpenseView,
  MethodView,
  ReimbursementKind,
  ReimbursementStatusView,
  ReimbursementView,
} from '../api/types';
import { BottomSheet, useIsMobile } from '../components/BottomSheet';
import { Chip } from '../components/Chip';
import { DatePicker, DateTrigger, fromIso, smartLabel, toIso } from '../components/DatePicker';
import { Popover } from '../components/Popover';
import { ReferenceSelect } from '../components/ReferenceSelect';
import { Toast, type ToastState } from '../components/Toast';
import {
  extractRawAmount,
  formatAmountInput,
  formatMajor,
  minorToDecimalString,
} from '../lib/money';
import { useFormattedAmount } from '../lib/useFormattedAmount';

interface RefData {
  readonly categories: ReadonlyArray<CategoryView>;
  readonly methods: ReadonlyArray<MethodView>;
  readonly statuses: ReadonlyArray<ReimbursementStatusView>;
}

interface FormState {
  readonly amountInput: string;
  readonly amountTouched: boolean;
  readonly description: string;
  readonly categoryId: string;
  readonly methodId: string;
  readonly reimbursementStatusId: string;
  readonly date: string;
}

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function longDate(iso: string): string {
  const d = new Date(iso);
  return `${DOW[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function isoToYmd(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function ymdToIso(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) return new Date().toISOString();
  return new Date(y, m - 1, d, 0, 0, 0, 0).toISOString();
}
function buildInitialForm(e: ExpenseView): FormState {
  return {
    // If the user typed a formula it stays editable. Otherwise show the value
    // pre-formatted with locale separators (`100.000`), matching what the
    // live-formatting input would display while the user edits. `extractRawAmount`
    // turns it back to plain digits when we send to the server.
    amountInput:
      e.rawInput ?? formatAmountInput(minorToDecimalString(e.amountMinor, e.currency), e.currency),
    amountTouched: false,
    description: e.description,
    categoryId: e.categoryId,
    methodId: e.methodId,
    reimbursementStatusId: e.reimbursementStatusId,
    date: isoToYmd(e.transactionDate),
  };
}

export default function ExpenseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [expense, setExpense] = useState<ExpenseView | null>(null);
  const [reimbursement, setReimbursement] = useState<ReimbursementView | null>(null);
  const [refs, setRefs] = useState<RefData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const [toast, setToast] = useState<ToastState | null>(null);
  const toastIdRef = useRef(0);
  const showToast = useCallback((kind: ToastState['kind'], message: string) => {
    toastIdRef.current += 1;
    setToast({ id: toastIdRef.current, kind, message });
  }, []);

  // Live-formatted amount input. Must be called unconditionally per Rules of
  // Hooks; safe when `form` is still null — `value` is empty and `onChange`
  // bails because the setter guards on prev=null.
  const amountInput = useFormattedAmount({
    value: form?.amountInput ?? '',
    onChange: (next: string) =>
      setForm((prev) => (prev ? { ...prev, amountInput: next, amountTouched: true } : prev)),
    currency: expense?.currency ?? 'IDR',
  });

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    Promise.all([
      expensesApi.get(id),
      reimbursementsApi.getByExpense(id).catch(() => null),
      categoriesApi.list({ includeArchived: true }),
      methodsApi.list({ includeArchived: true }),
      statusesApi.list({ includeArchived: true }),
    ])
      .then(([exp, reim, categories, methods, statuses]) => {
        if (cancelled) return;
        setExpense(exp);
        setReimbursement(reim);
        setRefs({ categories, methods, statuses });
        setForm(buildInitialForm(exp));
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setLoadError(e instanceof Error ? e.message : 'Failed to load expense');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const setField = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((prev) => (prev ? { ...prev, [k]: v } : prev));
  };

  const handleSave = async () => {
    if (!expense || !form || saving) return;
    const draft: { -readonly [K in keyof EditExpenseInput]: EditExpenseInput[K] } = {};
    if (form.amountTouched) {
      // The form's value carries locale separators while the user edits; strip
      // them before sending so the server's formula evaluator sees plain digits.
      const formRaw = extractRawAmount(form.amountInput, expense.currency).trim();
      const serverRaw = expense.rawInput ?? minorToDecimalString(expense.amountMinor, expense.currency);
      if (formRaw !== serverRaw) {
        draft.amountInput = formRaw;
      }
    }
    if (form.description !== expense.description) draft.description = form.description.trim();
    if (form.categoryId !== expense.categoryId) draft.categoryId = form.categoryId;
    if (form.methodId !== expense.methodId) draft.methodId = form.methodId;
    if (form.reimbursementStatusId !== expense.reimbursementStatusId) {
      draft.reimbursementStatusId = form.reimbursementStatusId;
    }
    if (form.date !== isoToYmd(expense.transactionDate)) {
      draft.transactionDate = ymdToIso(form.date);
    }
    if (Object.keys(draft).length === 0) {
      showToast('success', 'No changes to save');
      return;
    }
    const patch: EditExpenseInput = draft;
    setSaving(true);
    try {
      const next = await expensesApi.edit(expense.id, patch);
      setExpense(next);
      setForm(buildInitialForm(next));
      showToast('success', 'Saved');
    } catch (e) {
      showToast('error', e instanceof ApiError ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!expense || deleting) return;
    setDeleting(true);
    try {
      await expensesApi.delete(expense.id);
      navigate('/expenses');
    } catch (e) {
      showToast('error', e instanceof ApiError ? e.message : 'Failed to delete');
      setDeleting(false);
    }
  };

  const reloadReimbursement = useCallback(async () => {
    if (!id) return;
    try {
      const r = await reimbursementsApi.getByExpense(id);
      setReimbursement(r);
    } catch {
      /* no reimbursement is a valid state */
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center p-6">
        <Loader2 className="animate-spin text-ink-3" size={20} />
      </div>
    );
  }
  if (loadError || !expense || !form || !refs) {
    return (
      <div className="min-h-full p-6 text-rose-700 text-sm">
        {loadError ?? 'Expense not found.'}
      </div>
    );
  }

  const currentCategory = refs.categories.find((c) => c.id === form.categoryId);
  const currentMethod = refs.methods.find((m) => m.id === form.methodId);
  const currentStatus = refs.statuses.find((s) => s.id === form.reimbursementStatusId);

  return (
    <div className="min-h-full flex flex-col">
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      {/* Header band — design lines 1303–1317 */}
      <header className="px-5 md:px-8 pt-4 md:pt-6 pb-4 md:pb-5 border-b border-line flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <Link
            to="/expenses"
            className="inline-flex items-center gap-1.5 text-[11px] md:text-[11.5px] uppercase tracking-wider text-ink-3 font-semibold hover:text-ink"
          >
            <ArrowLeft size={13} />
            Expense · {longDate(expense.transactionDate)}
          </Link>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-[14px] font-mono text-ink-3">Rp</span>
          <span className="font-mono text-[28px] md:text-[34px] font-bold tracking-tight leading-none tabular-nums">
            {formatMajor(
              minorToDecimalString(expense.amountMinor, expense.currency),
              expense.currency,
            )}
          </span>
        </div>
        {expense.rawInput && expense.rawInput.startsWith('=') && (
          <div className="text-[11.5px] font-mono text-ink-3 mt-1">{expense.rawInput}</div>
        )}
        <div className="mt-3 text-[14px] md:text-[15px] font-medium text-ink">
          {expense.description}
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {currentCategory && <Chip token={currentCategory} size="md" />}
          {currentMethod && <Chip token={currentMethod} size="md" />}
          {currentStatus && <Chip token={currentStatus} size="md" />}
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto pb-24 md:pb-20">
        {/* Edit form */}
        <section className="px-5 md:px-8 py-5 md:py-6 border-b border-line">
          <div className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold mb-3">
            Edit
          </div>
          <div className="max-w-2xl flex flex-col gap-4">
            <Field label="Amount">
              <input
                ref={amountInput.ref}
                type="text"
                inputMode="decimal"
                value={form.amountInput}
                onChange={amountInput.onChange}
                placeholder="20000 or =20000*5"
                className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-white text-[14px] font-medium tabular-nums outline-none focus:border-ink focus:ring-2 focus:ring-ink/10 transition"
              />
              <p className="text-[11px] text-ink-3 mt-1">
                Server re-evaluates the formula on save.
              </p>
            </Field>

            <Field label="Description">
              <input
                type="text"
                value={form.description}
                onChange={(e) => setField('description', e.target.value)}
                maxLength={280}
                className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-white text-[14px] outline-none focus:border-ink focus:ring-2 focus:ring-ink/10 transition"
              />
            </Field>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ReferenceSelect
                api={categoriesApi}
                label="Category"
                singular="Category"
                value={form.categoryId}
                onChange={(v) => setField('categoryId', v)}
                items={refs.categories}
                onItemsChanged={(next) => setRefs({ ...refs, categories: [...next] })}
              />
              <ReferenceSelect
                api={methodsApi}
                label="Method"
                singular="Method"
                value={form.methodId}
                onChange={(v) => setField('methodId', v)}
                items={refs.methods}
                onItemsChanged={(next) => setRefs({ ...refs, methods: [...next] })}
              />
            </div>

            <ReferenceSelect
              api={statusesApi}
              label="Reimbursement label"
              singular="Status"
              value={form.reimbursementStatusId}
              onChange={(v) => setField('reimbursementStatusId', v)}
              items={refs.statuses}
              onItemsChanged={(next) => setRefs({ ...refs, statuses: [...next] })}
            />
            <p className="text-[11.5px] text-ink-3 -mt-2 border-l-2 border-line pl-3 py-1 leading-relaxed">
              The <span className="font-semibold text-ink-2">label</span> is what shows in lists. The
              actual reimbursement <span className="font-semibold text-ink-2">state</span> is
              controlled below.
            </p>

            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold">Date</span>
              <FormDateField value={form.date} onChange={(v) => setField('date', v)} />
            </div>
          </div>
        </section>

        {/* Reimbursement state panel */}
        {reimbursement && (
          <section className="px-5 md:px-8 py-5 md:py-6 border-b border-line">
            <ReimbursementPanel
              reimbursement={reimbursement}
              onChanged={reloadReimbursement}
              onError={(m) => showToast('error', m)}
              onSuccess={(m) => showToast('success', m)}
            />
          </section>
        )}

        {/* Metadata */}
        <section className="px-5 md:px-8 py-5 md:py-6">
          <div className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold mb-2">
            Metadata
          </div>
          <div className="grid grid-cols-[100px_minmax(0,1fr)] md:grid-cols-[140px_minmax(0,1fr)] gap-y-2 text-[12.5px]">
            <div className="text-ink-3">Created</div>
            <div className="text-ink-2 tabular-nums">{new Date(expense.createdAt).toLocaleString()}</div>
            {expense.updatedAt !== expense.createdAt && (
              <>
                <div className="text-ink-3">Last edited</div>
                <div className="text-ink-2 tabular-nums">
                  {new Date(expense.updatedAt).toLocaleString()}
                </div>
              </>
            )}
            <div className="text-ink-3">ID</div>
            <div className="text-ink-3 font-mono text-[11px] truncate">{expense.id}</div>
          </div>
        </section>
      </div>

      {/* Footer action bar */}
      <div className="fixed md:static bottom-16 md:bottom-auto inset-x-0 md:inset-x-auto border-t border-line bg-white px-5 md:px-8 py-3 flex items-center gap-2 flex-shrink-0 z-10">
        <button
          type="button"
          onClick={() => setConfirmingDelete(true)}
          className="px-3 py-2 rounded-lg border border-rose-200 text-[12.5px] font-semibold text-rose-700 hover:bg-rose-50 inline-flex items-center gap-1.5"
        >
          <Trash2 size={13} />
          Delete
        </button>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="px-4 py-2 rounded-lg text-[12.5px] font-semibold text-paper bg-ink hover:bg-ink-2 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>

      {confirmingDelete && (
        <ConfirmDelete
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={() => void handleDelete()}
          deleting={deleting}
        />
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  readonly label: string;
  readonly children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold">{label}</span>
      {children}
    </label>
  );
}

// ---- Reimbursement transition panel ----

const KIND_LABEL: Record<ReimbursementKind, string> = {
  NonReimbursable: 'Non-Reimbursable',
  UnpaidReimbursable: 'Unpaid',
  PaidReimbursable: 'Paid',
  EarlyReimbursement: 'Early',
  PendingReimbursement: 'Pending',
};

interface TransitionDef {
  readonly id: string;
  readonly label: string;
  readonly needsDate?: 'paidAt' | 'receivedAt';
  readonly variant?: 'destructive';
}

function legalTransitions(kind: ReimbursementKind): ReadonlyArray<TransitionDef> {
  switch (kind) {
    case 'UnpaidReimbursable':
      return [
        { id: 'markPaid', label: 'Mark Paid', needsDate: 'paidAt' },
        { id: 'markEarly', label: 'Mark Early', needsDate: 'receivedAt' },
        { id: 'markPending', label: 'Mark Pending' },
        { id: 'markNonReimbursable', label: 'Mark Non-Reimbursable', variant: 'destructive' },
      ];
    case 'EarlyReimbursement':
      return [
        { id: 'markPaid', label: 'Mark Paid', needsDate: 'paidAt' },
        { id: 'markUnpaid', label: 'Mark Unpaid' },
      ];
    case 'PendingReimbursement':
      return [
        { id: 'markPaid', label: 'Mark Paid', needsDate: 'paidAt' },
        { id: 'markUnpaid', label: 'Mark Unpaid' },
      ];
    case 'NonReimbursable':
    case 'PaidReimbursable':
      return [];
  }
}

function ReimbursementPanel({
  reimbursement,
  onChanged,
  onError,
  onSuccess,
}: {
  readonly reimbursement: ReimbursementView;
  readonly onChanged: () => Promise<void>;
  readonly onError: (m: string) => void;
  readonly onSuccess: (m: string) => void;
}) {
  const [pending, setPending] = useState<TransitionDef | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [date, setDate] = useState(() => isoToYmd(new Date().toISOString()));

  const transitions = legalTransitions(reimbursement.kind);

  const run = async (def: TransitionDef, dateValue?: string) => {
    setBusy(def.id);
    try {
      const iso = dateValue ? ymdToIso(dateValue) : undefined;
      switch (def.id) {
        case 'markPaid':
          if (!iso) throw new Error('paidAt required');
          await reimbursementsApi.markPaid(reimbursement.id, iso);
          break;
        case 'markEarly':
          if (!iso) throw new Error('receivedAt required');
          await reimbursementsApi.markEarly(reimbursement.id, iso);
          break;
        case 'markPending':
          await reimbursementsApi.markPending(reimbursement.id);
          break;
        case 'markUnpaid':
          await reimbursementsApi.markUnpaid(reimbursement.id);
          break;
        case 'markNonReimbursable':
          await reimbursementsApi.markNonReimbursable(reimbursement.id);
          break;
      }
      await onChanged();
      onSuccess(`${def.label} applied`);
      setPending(null);
    } catch (e) {
      onError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold mb-2">
        Reimbursement state
      </div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Chip
          token={{
            name: KIND_LABEL[reimbursement.kind],
            bgColor: '#f2efe8',
            textColor: '#0a0908',
          }}
          size="md"
        />
        {reimbursement.paidAt && (
          <span className="text-[11.5px] text-ink-3">
            paid {new Date(reimbursement.paidAt).toLocaleDateString()}
          </span>
        )}
        {reimbursement.receivedAt && (
          <span className="text-[11.5px] text-ink-3">
            received {new Date(reimbursement.receivedAt).toLocaleDateString()}
          </span>
        )}
      </div>

      {transitions.length === 0 ? (
        <p className="text-[12px] text-ink-3">Terminal state — no further transitions.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {transitions.map((t) => (
            <button
              key={t.id}
              type="button"
              disabled={busy !== null}
              onClick={() => {
                if (t.needsDate) {
                  setPending(t);
                } else {
                  void run(t);
                }
              }}
              className={[
                'px-3 py-2 rounded-lg text-[13px] font-medium border disabled:opacity-50 transition',
                t.variant === 'destructive'
                  ? 'border-rose-200 text-rose-700 hover:bg-rose-50'
                  : 'border-line text-ink-2 hover:bg-paper-2',
              ].join(' ')}
            >
              {busy === t.id ? 'Working…' : t.label}
            </button>
          ))}
        </div>
      )}

      {pending && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-ink/30">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[15px] font-semibold">{pending.label}</h3>
              <button
                type="button"
                onClick={() => setPending(null)}
                className="text-ink-3 hover:text-ink"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-[12px] text-ink-3 mb-3">
              Pick the {pending.needsDate === 'paidAt' ? 'payment' : 'receipt'} date.
            </p>
            <DatePicker
              mode="single"
              value={fromIso(date)}
              onChange={(d) => setDate(toIso(d))}
              showFooter={false}
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setPending(null)}
                className="flex-1 py-2 rounded-lg border border-line text-[13px] font-medium hover:bg-paper-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void run(pending, date)}
                disabled={busy !== null}
                className="flex-1 py-2 rounded-lg bg-ink text-paper text-[13px] font-semibold hover:bg-ink-2 disabled:opacity-50"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FormDateField({
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
      <DateTrigger value={label} open={open} onClick={() => setOpen((v) => !v)} variant="lg" />
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

function ConfirmDelete({
  onCancel,
  onConfirm,
  deleting,
}: {
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
  readonly deleting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-ink/30">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5">
        <h3 className="text-[15px] font-semibold mb-2">Delete this expense?</h3>
        <p className="text-[13px] text-ink-2 mb-4">
          The expense and its reimbursement record will be removed. This can't be undone.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2 rounded-lg border border-line text-[13px] font-medium hover:bg-paper-2"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 py-2 rounded-lg bg-rose-700 text-rose-50 text-[13px] font-semibold hover:bg-rose-800 disabled:opacity-50"
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
