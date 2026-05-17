import { http } from './http';
import type {
  EditExpenseInput,
  ExpenseListView,
  ExpenseView,
  ListExpensesQuery,
  RecordExpenseInput,
} from './types';

const ROOT = '/api/expenses';

function buildQuery(q: ListExpensesQuery): string {
  const p = new URLSearchParams();
  if (q.dateStart) p.set('dateStart', q.dateStart);
  if (q.dateEnd) p.set('dateEnd', q.dateEnd);
  if (q.categoryId) p.set('categoryId', q.categoryId);
  if (q.methodId) p.set('methodId', q.methodId);
  if (q.reimbursementStatusId) p.set('reimbursementStatusId', q.reimbursementStatusId);
  if (q.descriptionQuery) p.set('descriptionQuery', q.descriptionQuery);
  if (q.limit !== undefined) p.set('limit', String(q.limit));
  if (q.offset !== undefined) p.set('offset', String(q.offset));
  const s = p.toString();
  return s ? `?${s}` : '';
}

export const expensesApi = {
  record: (input: RecordExpenseInput) => http.post<ExpenseView>(ROOT, input),
  list: (query: ListExpensesQuery = {}) =>
    http.get<ExpenseListView>(`${ROOT}${buildQuery(query)}`),
  get: (id: string) => http.get<ExpenseView>(`${ROOT}/${id}`),
  edit: (id: string, input: EditExpenseInput) =>
    http.patch<ExpenseView>(`${ROOT}/${id}`, input),
  delete: (id: string) => http.del<void>(`${ROOT}/${id}`),
};
