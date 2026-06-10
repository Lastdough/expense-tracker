import { type Money } from '../../../../shared-kernel/money/Money.js';

/**
 * One line per unique expense description in the range. `total` is the
 * net signed amount across all Unpaid (positive) + Early (negative) rows
 * with that description — i.e. what's still owed to the user for that
 * "thing." `unpaidCount` and `earlyCount` give the breakdown for UI use.
 */
export interface ReceiptLine {
  readonly description: string;
  readonly total: Money;
  readonly unpaidTotal: Money;
  readonly earlyTotal: Money;
  readonly unpaidCount: number;
  readonly earlyCount: number;
}

/**
 * Half-open range receipt. `grandTotal` = sum of line totals = the "amount
 * currently owed to you" across the range. Null when there are no Unpaid
 * or Early rows in the range (currency is unknown).
 */
export interface Receipt {
  readonly dateStart: Date;
  readonly dateEnd: Date;
  readonly currency: string | null;
  readonly lines: readonly ReceiptLine[];
  readonly grandTotal: Money | null;
}

export interface ExportDataLine {
  readonly transactionDate: Date;
  readonly total: Money;
  readonly out: Money;
  readonly formula: string;
  readonly unpaidTotal: Money;
  readonly earlyTotal: Money;
  readonly description: string;
  readonly category: string;
  readonly method: string;
  readonly reimbursementStatus: string
}


export interface ExportData {
  readonly currency: string | null;
  readonly lines: readonly ExportDataLine[];
}