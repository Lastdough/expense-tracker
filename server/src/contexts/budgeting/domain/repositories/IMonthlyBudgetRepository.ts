import { type MonthlyBudget } from '../entities/MonthlyBudget.js';

export interface IMonthlyBudgetRepository {
  /** Returns the singleton MonthlyBudget, or null if it has never been set. */
  get(): Promise<MonthlyBudget | null>;
  /** Upserts the singleton row. */
  save(budget: MonthlyBudget): Promise<void>;
}
