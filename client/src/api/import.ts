import { http } from './http';

export interface ImportRowReportError {
  readonly code: string;
  readonly field: string | null;
  readonly message: string;
  readonly suggestion: string | null;
}

export interface ImportRowReport {
  readonly rowNumber: number;
  readonly status: 'ok' | 'error';
  readonly raw: Readonly<Record<string, string>>;
  readonly error: ImportRowReportError | null;
  readonly expenseId: string | null;
}

export interface ImportReport {
  readonly dryRun: boolean;
  readonly totalRows: number;
  readonly validRows: number;
  readonly invalidRows: number;
  readonly committed: boolean;
  readonly rows: ReadonlyArray<ImportRowReport>;
}

export interface ImportInput {
  readonly csvText: string;
  readonly defaultYear: number;
  readonly dryRun: boolean;
}

export const importApi = {
  run: (input: ImportInput) => http.post<ImportReport>('/api/import', input),
};
