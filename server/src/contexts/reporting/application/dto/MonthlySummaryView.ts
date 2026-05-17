import { type MonthlySummary } from '../../domain/value-objects/MonthlySummary.js';

export interface MonthlySummaryView {
  readonly month: string;
  readonly start: string;
  readonly end: string;
  readonly currency: string | null;
  readonly total: { amountMinor: string; amountMajor: string } | null;
  readonly expenseCount: number;
  readonly byCategory: readonly {
    readonly categoryId: string;
    readonly categoryName: string;
    readonly bgColor: string;
    readonly textColor: string;
    readonly amountMinor: string;
    readonly amountMajor: string;
    readonly count: number;
  }[];
  readonly byMethod: readonly {
    readonly methodId: string;
    readonly methodName: string;
    readonly bgColor: string;
    readonly textColor: string;
    readonly amountMinor: string;
    readonly amountMajor: string;
    readonly count: number;
  }[];
}

export function serializeMonthlySummary(s: MonthlySummary): MonthlySummaryView {
  return {
    month: s.month,
    start: s.start.toISOString(),
    end: s.end.toISOString(),
    currency: s.currency,
    total: s.total
      ? { amountMinor: s.total.amount.toString(), amountMajor: s.total.toMajor() }
      : null,
    expenseCount: s.expenseCount,
    byCategory: s.byCategory.map((row) => ({
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      bgColor: row.bgColor,
      textColor: row.textColor,
      amountMinor: row.total.amount.toString(),
      amountMajor: row.total.toMajor(),
      count: row.count,
    })),
    byMethod: s.byMethod.map((row) => ({
      methodId: row.methodId,
      methodName: row.methodName,
      bgColor: row.bgColor,
      textColor: row.textColor,
      amountMinor: row.total.amount.toString(),
      amountMajor: row.total.toMajor(),
      count: row.count,
    })),
  };
}
