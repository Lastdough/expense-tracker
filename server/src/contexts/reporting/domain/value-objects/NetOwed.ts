import { type Money } from '../../../../shared-kernel/money/Money.js';

/**
 * netOwed = sum(Unpaid) - sum(|Early|) over a date range.
 *
 * Positive means money is owed *to* the user (more pending reimbursements
 * than advance receipts).
 *
 * All amounts are null when the range contains zero Unpaid/Early rows —
 * we don't know the currency in that case and the caller renders empty.
 */
export interface NetOwedSnapshot {
  readonly dateStart: Date;
  readonly dateEnd: Date;
  readonly currency: string | null;
  readonly sumUnpaid: Money | null;
  readonly sumEarly: Money | null;
  readonly netOwed: Money | null;
}
