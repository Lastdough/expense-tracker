import { type Money } from '../../../../shared-kernel/money/Money.js';

/**
 * availableBudget = monthlyBudget - netOwed.
 *
 * netOwed is sum(Unpaid) - sum(|Early|) over the month — positive means
 * money locked up in pending reimbursements, reducing what's spendable.
 *
 * monthlyBudget / availableBudget are null when the user has not yet set
 * a budget. netOwed is always reported (even when there's no budget) so
 * the UI can show "what's owed to me" independently.
 */
export interface AvailableBudgetSnapshot {
  readonly month: string;
  readonly currency: string | null;
  readonly monthlyBudget: Money | null;
  readonly netOwed: Money | null;
  readonly availableBudget: Money | null;
}
