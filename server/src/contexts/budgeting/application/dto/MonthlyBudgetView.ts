import { type MonthlyBudget } from '../../domain/entities/MonthlyBudget.js';

export interface MonthlyBudgetView {
  readonly amountMinor: string;
  readonly amountMajor: string;
  readonly currency: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export function serializeMonthlyBudget(b: MonthlyBudget): MonthlyBudgetView {
  return {
    amountMinor: b.amount.amount.toString(),
    amountMajor: b.amount.toMajor(),
    currency: b.amount.currency,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  };
}
