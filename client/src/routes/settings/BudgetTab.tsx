import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

import { budgetingApi } from '../../api/budgeting';
import { ApiError } from '../../api/http';
import type { MonthlyBudgetView } from '../../api/types';
import { formatMajor } from '../../lib/money';

const SUPPORTED_CURRENCIES = ['IDR'] as const; // expand when multi-currency lands

export interface BudgetTabProps {
  readonly onSuccess: (msg: string) => void;
  readonly onError: (msg: string) => void;
}

export function BudgetTab({ onSuccess, onError }: BudgetTabProps) {
  const [budget, setBudget] = useState<MonthlyBudgetView | null>(null);
  const [amountMajor, setAmountMajor] = useState('');
  const [currency] = useState<string>('IDR');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await budgetingApi.get();
      setBudget(res.budget);
      setAmountMajor(res.budget?.amountMajor ?? '');
    } catch (e) {
      onError(e instanceof ApiError ? e.message : 'Failed to load budget');
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    const trimmed = amountMajor.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      const res = await budgetingApi.set({ amountMajor: trimmed, currency });
      setBudget(res.budget);
      setAmountMajor(res.budget.amountMajor);
      onSuccess('Budget saved');
    } catch (e) {
      onError(e instanceof ApiError ? e.message : 'Failed to save budget');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-stone-400" size={20} />
      </div>
    );
  }

  const preview = amountMajor.trim() && /^[0-9.,]+$/.test(amountMajor.trim())
    ? formatMajor(amountMajor.trim(), currency)
    : null;

  return (
    <div className="px-5 md:px-8 py-6 max-w-xl">
      <div className="mb-4">
        <h2 className="text-[18px] font-bold tracking-tight">Monthly Budget</h2>
        <p className="text-[13px] text-stone-500 mt-1">
          The Dashboard's <em>Available Budget</em> tile subtracts pending reimbursements from this
          to show what you can still spend.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="bd-amount"
            className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold"
          >
            Amount
          </label>
          <input
            id="bd-amount"
            type="text"
            inputMode="decimal"
            value={amountMajor}
            onChange={(e) => setAmountMajor(e.target.value)}
            placeholder="e.g. 5000000"
            className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 bg-white text-[14px] font-medium tabular-nums outline-none focus:border-stone-900 focus:ring-2 focus:ring-stone-900/10"
          />
          {preview !== null && (
            <p className="text-[12px] text-stone-600">
              = {preview} {currency}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="bd-currency"
            className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold"
          >
            Currency
          </label>
          <select
            id="bd-currency"
            value={currency}
            disabled
            className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 bg-stone-100 text-[14px] outline-none cursor-not-allowed"
            title="Multi-currency will land in a later phase"
          >
            {SUPPORTED_CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => void save()}
          disabled={saving || amountMajor.trim().length === 0}
          className="mt-2 py-2.5 rounded-lg text-[13px] font-semibold text-stone-50 bg-stone-900 hover:bg-stone-800 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save budget'}
        </button>

        {budget && (
          <div className="mt-3 text-[12px] text-stone-500">
            Last updated {new Date(budget.updatedAt).toLocaleString()}
          </div>
        )}
        {!budget && (
          <div className="mt-3 text-[12px] text-stone-500">
            No budget set yet.
          </div>
        )}
      </div>
    </div>
  );
}
