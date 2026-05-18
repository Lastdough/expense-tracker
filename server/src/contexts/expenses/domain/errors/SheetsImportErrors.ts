import { DomainError } from '../../../../shared-kernel/errors/DomainError.js';

/**
 * Parse-time errors raised while interpreting a single CSV row in the user's
 * Sheets-export format. Pure structural problems — no DB lookup involved.
 * Cross-context reference resolution failures are surfaced separately via
 * `ReferenceNotFoundError` from `ExpenseErrors`.
 */
export class InvalidSheetsRowError extends DomainError {
  readonly code = 'invalid_sheets_row';
  constructor(
    public readonly field: string,
    public readonly rawValue: string,
    message: string,
  ) {
    super(message);
  }
}

/** The CSV header was missing one of the required columns. Whole-file error. */
export class MissingSheetsColumnError extends DomainError {
  readonly code = 'missing_sheets_column';
  constructor(public readonly columnName: string) {
    super(`Required column "${columnName}" not found in CSV header.`);
  }
}

/** The CSV was syntactically broken (papaparse-level errors). */
export class MalformedCsvError extends DomainError {
  readonly code = 'malformed_csv';
}
