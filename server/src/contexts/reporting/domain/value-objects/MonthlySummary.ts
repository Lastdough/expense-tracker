import { type Money } from '../../../../shared-kernel/money/Money.js';

export interface CategoryBreakdownRow {
  readonly categoryId: string;
  readonly categoryName: string;
  readonly bgColor: string;
  readonly textColor: string;
  readonly total: Money;
  readonly count: number;
}

export interface MethodBreakdownRow {
  readonly methodId: string;
  readonly methodName: string;
  readonly bgColor: string;
  readonly textColor: string;
  readonly total: Money;
  readonly count: number;
}

export interface MonthlySummary {
  readonly month: string;
  readonly start: Date;
  readonly end: Date;
  /** The currency the summary is denominated in. Null only when there are
   *  no expenses in the range — caller should render the user's default. */
  readonly currency: string | null;
  readonly total: Money | null;
  readonly expenseCount: number;
  readonly byCategory: readonly CategoryBreakdownRow[];
  readonly byMethod: readonly MethodBreakdownRow[];
}
