import { type Money } from '../../../../shared-kernel/money/Money.js';
import { type Receipt } from '../../domain/value-objects/Receipt.js';

interface MoneyView {
  readonly amountMinor: string;
  readonly amountMajor: string;
}

function moneyView(m: Money | null): MoneyView | null {
  return m ? { amountMinor: m.amount.toString(), amountMajor: m.toMajor() } : null;
}

export interface ReceiptView {
  readonly dateStart: string;
  readonly dateEnd: string;
  readonly currency: string | null;
  readonly lines: readonly {
    readonly description: string;
    readonly unpaidTotal: MoneyView;
    readonly earlyTotal: MoneyView;
    readonly total: MoneyView;
    readonly unpaidCount: number;
    readonly earlyCount: number;
  }[];
  readonly grandTotal: MoneyView | null;
}

export function serializeReceipt(r: Receipt): ReceiptView {
  return {
    dateStart: r.dateStart.toISOString(),
    dateEnd: r.dateEnd.toISOString(),
    currency: r.currency,
    lines: r.lines.map((line) => ({
      description: line.description,
      unpaidTotal: moneyView(line.unpaidTotal) as MoneyView,
      earlyTotal: moneyView(line.earlyTotal) as MoneyView,
      total: moneyView(line.total) as MoneyView,
      unpaidCount: line.unpaidCount,
      earlyCount: line.earlyCount,
    })),
    grandTotal: moneyView(r.grandTotal),
  };
}
