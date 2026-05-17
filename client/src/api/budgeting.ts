import { http } from './http';
import type { MonthlyBudgetView, SetMonthlyBudgetInput } from './types';

const ROOT = '/api/budget/monthly';

interface MonthlyBudgetResponse {
  readonly budget: MonthlyBudgetView | null;
}

interface MonthlyBudgetSetResponse {
  readonly budget: MonthlyBudgetView;
}

export const budgetingApi = {
  get: () => http.get<MonthlyBudgetResponse>(ROOT),
  set: (input: SetMonthlyBudgetInput) => http.put<MonthlyBudgetSetResponse>(ROOT, input),
};
