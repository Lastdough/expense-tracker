import { http } from './http';
import type { ReimbursementListView, ReimbursementView } from './types';

const ROOT = '/api/reimbursements';

export const reimbursementsApi = {
  get: (id: string) => http.get<ReimbursementView>(`${ROOT}/${id}`),
  getByExpense: (expenseId: string) =>
    http.get<ReimbursementView>(`${ROOT}/by-expense/${expenseId}`),
  listUnpaid: (dateStart: string, dateEnd: string) => {
    const p = new URLSearchParams({ status: 'unpaid', dateStart, dateEnd });
    return http.get<ReimbursementListView>(`${ROOT}?${p.toString()}`);
  },
  markPaid: (id: string, paidAt: string) =>
    http.post<ReimbursementView>(`${ROOT}/${id}/mark-paid`, { paidAt }),
  markPending: (id: string) =>
    http.post<ReimbursementView>(`${ROOT}/${id}/mark-pending`),
  markEarly: (id: string, receivedAt: string) =>
    http.post<ReimbursementView>(`${ROOT}/${id}/mark-early`, { receivedAt }),
  markUnpaid: (id: string) =>
    http.post<ReimbursementView>(`${ROOT}/${id}/mark-unpaid`),
  markNonReimbursable: (id: string) =>
    http.post<ReimbursementView>(`${ROOT}/${id}/mark-non-reimbursable`),
};
