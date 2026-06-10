import { absoluteUrl, http } from './http';
import type {
  AvailableBudgetView,
  MonthlySummaryView,
  NetOwedView,
  ReceiptView,
} from './types';

const ROOT = '/api/reports';

function receiptQuery(dateStart: string, dateEnd: string, format: 'json' | 'html' | 'csv'): string {
  // `simple=true` is the default on the server today; carrying it explicitly
  // here keeps the call sites self-documenting for the future Complex toggle
  // (pass `simple=false` to opt in).
  return `?${new URLSearchParams({ dateStart, dateEnd, format, simple: 'true' }).toString()}`;
}

export const reportingApi = {
  monthlySummary: (month: string) =>
    http.get<MonthlySummaryView>(`${ROOT}/monthly-summary?month=${month}`),
  netOwed: (dateStart: string, dateEnd: string) => {
    const p = new URLSearchParams({ dateStart, dateEnd });
    return http.get<NetOwedView>(`${ROOT}/net-owed?${p.toString()}`);
  },
  availableBudget: (month: string) =>
    http.get<AvailableBudgetView>(`${ROOT}/available-budget?month=${month}`),
  receiptJson: (dateStart: string, dateEnd: string) =>
    http.get<ReceiptView>(`${ROOT}/receipt${receiptQuery(dateStart, dateEnd, 'json')}`),
  receiptHtml: (dateStart: string, dateEnd: string) =>
    http.getText(`${ROOT}/receipt${receiptQuery(dateStart, dateEnd, 'html')}`),
  receiptCsvUrl: (dateStart: string, dateEnd: string) =>
    absoluteUrl(`${ROOT}/receipt${receiptQuery(dateStart, dateEnd, 'csv')}`),
  exportAllCsvUrl: () => absoluteUrl(`${ROOT}/export`),
};
