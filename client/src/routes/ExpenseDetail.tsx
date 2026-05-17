import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react';

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
import { Chip } from '../components/Chip';
import { ReferenceSelect } from '../components/ReferenceSelect';
import { Toast, type ToastState } from '../components/Toast';

interface RefData {
  readonly categories: ReadonlyArray<CategoryView>;
  readonly methods: ReadonlyArray<MethodView>;
  readonly statuses: ReadonlyArray<ReimbursementStatusView>;
}

interface FormState {
  readonly amountInput: string; // free-text; if user edits, sent as amountInput
  readonly amountTouched: boolean;
  readonly description: string;
  readonly categoryId: string;
  readonly methodId: string;
  readonly reimbursementStatusId: string;
  readonly date: string; // YYYY-MM-DD
}

function isoToYmd(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function ymdToIso(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) return new Date().toISOString();
  return new Date(y, m - 1, d, 0, 0, 0, 0).toISOString();
}
function buildInitialForm(e: ExpenseView): FormState {
  return {
    amountInput: e.rawInput ?? e.amountFormatted,
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

  // Load everything in parallel.
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
    if (form.amountTouched && form.amountInput !== (expense.rawInput ?? '')) {
      draft.amountInput = form.amountInput.trim();
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
      /* no reimbursement is a valid state (NonReimbursable expense) */
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center p-6">
        <Loader2 className="animate-spin text-stone-400" size={20} />
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

  return (
    <div className="min-h-full px-4 py-5 md:px-8 md:py-8">
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      <div className="max-w-2xl mx-auto">
        <Link
          to="/expenses"
          className="inline-flex items-center gap-1.5 text-[13px] text-stone-500 hover:text-stone-900 mb-4"
        >
          <ArrowLeft size={14} />
          Back to expenses
        </Link>

        <header className="mb-6">
          <div className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold">
            Expense
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-0.5">
            {expense.amountFormatted}
          </h1>
          <div className="text-[12px] text-stone-500 mt-1">
            Recorded {new Date(expense.createdAt).toLocaleString()}
            {expense.rawInput && (
              <>
                {' · '}
                <span className="font-mono">{expense.rawInput}</span>
              </>
            )}
          </div>
        </header>

        <section className="flex flex-col gap-4">
          <Field label="Amount">
            <input
              type="text"
              inputMode="decimal"
              value={form.amountInput}
              onChange={(e) =>
                setForm((p) => (p ? { ...p, amountInput: e.target.value, amountTouched: true } : p))
              }
              placeholder="20000 or =20000*5"
              className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 bg-white text-[14px] font-medium tabular-nums outline-none focus:border-stone-900 focus:ring-2 focus:ring-stone-900/10"
            />
            <p className="text-[11px] text-stone-400 mt-1">
              Server re-evaluates the formula on save.
            </p>
          </Field>

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

          <Field label="Description">
            <input
              type="text"
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              maxLength={280}
              className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 bg-white text-[14px] outline-none focus:border-stone-900 focus:ring-2 focus:ring-stone-900/10"
            />
          </Field>

          <ReferenceSelect
            api={statusesApi}
            label="Reimbursement label"
            singular="Status"
            value={form.reimbursementStatusId}
            onChange={(v) => setField('reimbursementStatusId', v)}
            items={refs.statuses}
            onItemsChanged={(next) => setRefs({ ...refs, statuses: [...next] })}
          />
          <p className="text-[11px] text-stone-500 -mt-2">
            The label is what shows in lists. The actual reimbursement state is controlled below.
          </p>

          <Field label="Date">
            <input
              type="date"
              value={form.date}
              onChange={(e) => setField('date', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 bg-white text-[14px] outline-none focus:border-stone-900 focus:ring-2 focus:ring-stone-900/10"
            />
          </Field>

          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="flex-[2] py-2.5 rounded-lg text-[13px] font-semibold text-stone-50 bg-stone-900 hover:bg-stone-800 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="px-3 py-2.5 rounded-lg text-[13px] font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 inline-flex items-center gap-1.5"
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        </section>

        {reimbursement && (
          <ReimbursementPanel
            reimbursement={reimbursement}
            onChanged={reloadReimbursement}
            onError={(m) => showToast('error', m)}
            onSuccess={(m) => showToast('success', m)}
          />
        )}

        {confirmingDelete && (
          <ConfirmDelete
            onCancel={() => setConfirmingDelete(false)}
            onConfirm={() => void handleDelete()}
            deleting={deleting}
          />
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { readonly label: string; readonly children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold">
        {label}
      </span>
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
  const [date, setDate] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });

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
    <section className="mt-8 pt-6 border-t border-line">
      <div className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold mb-2">
        Reimbursement state
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Chip
          token={{
            name: KIND_LABEL[reimbursement.kind],
            bgColor: '#f2efe8',
            textColor: '#0a0908',
          }}
          size="md"
        />
        {reimbursement.paidAt && (
          <span className="text-[12px] text-stone-500">
            paid {new Date(reimbursement.paidAt).toLocaleDateString()}
          </span>
        )}
        {reimbursement.receivedAt && (
          <span className="text-[12px] text-stone-500">
            received {new Date(reimbursement.receivedAt).toLocaleDateString()}
          </span>
        )}
      </div>

      {transitions.length === 0 ? (
        <p className="text-[12px] text-stone-500 mt-3">Terminal state — no further transitions.</p>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
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
                'px-3 py-2 rounded-lg text-[13px] font-medium border disabled:opacity-50',
                t.variant === 'destructive'
                  ? 'border-rose-200 text-rose-700 hover:bg-rose-50'
                  : 'border-stone-300 text-stone-900 hover:bg-stone-50',
              ].join(' ')}
            >
              {busy === t.id ? 'Working…' : t.label}
            </button>
          ))}
        </div>
      )}

      {pending && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-stone-900/30">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5">
            <h3 className="text-[15px] font-semibold mb-1">{pending.label}</h3>
            <p className="text-[12px] text-stone-500 mb-3">
              Pick the {pending.needsDate === 'paidAt' ? 'payment' : 'receipt'} date.
            </p>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-stone-300 text-[14px] outline-none focus:border-stone-900 focus:ring-2 focus:ring-stone-900/10"
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setPending(null)}
                className="flex-1 py-2 rounded-lg border border-stone-300 text-[13px] font-medium hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void run(pending, date)}
                disabled={busy !== null}
                className="flex-1 py-2 rounded-lg bg-stone-900 text-stone-50 text-[13px] font-semibold hover:bg-stone-800 disabled:opacity-50"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
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
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-stone-900/30">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5">
        <h3 className="text-[15px] font-semibold mb-2">Delete this expense?</h3>
        <p className="text-[13px] text-stone-600 mb-4">
          The expense and its reimbursement record will be removed. This can't be undone.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2 rounded-lg border border-stone-300 text-[13px] font-medium hover:bg-stone-50"
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
