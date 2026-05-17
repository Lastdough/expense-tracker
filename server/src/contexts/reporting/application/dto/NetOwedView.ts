import { type Money } from '../../../../shared-kernel/money/Money.js';
import { type AvailableBudgetSnapshot } from '../../domain/value-objects/AvailableBudget.js';
import { type NetOwedSnapshot } from '../../domain/value-objects/NetOwed.js';

interface MoneyView {
  readonly amountMinor: string;
  readonly amountMajor: string;
}

function moneyView(m: Money | null): MoneyView | null {
  return m ? { amountMinor: m.amount.toString(), amountMajor: m.toMajor() } : null;
}

export interface NetOwedView {
  readonly dateStart: string;
  readonly dateEnd: string;
  readonly currency: string | null;
  readonly sumUnpaid: MoneyView | null;
  readonly sumEarly: MoneyView | null;
  readonly netOwed: MoneyView | null;
}

export function serializeNetOwed(s: NetOwedSnapshot): NetOwedView {
  return {
    dateStart: s.dateStart.toISOString(),
    dateEnd: s.dateEnd.toISOString(),
    currency: s.currency,
    sumUnpaid: moneyView(s.sumUnpaid),
    sumEarly: moneyView(s.sumEarly),
    netOwed: moneyView(s.netOwed),
  };
}

export interface AvailableBudgetView {
  readonly month: string;
  readonly currency: string | null;
  readonly monthlyBudget: MoneyView | null;
  readonly netOwed: MoneyView | null;
  readonly availableBudget: MoneyView | null;
}

export function serializeAvailableBudget(s: AvailableBudgetSnapshot): AvailableBudgetView {
  return {
    month: s.month,
    currency: s.currency,
    monthlyBudget: moneyView(s.monthlyBudget),
    netOwed: moneyView(s.netOwed),
    availableBudget: moneyView(s.availableBudget),
  };
}
