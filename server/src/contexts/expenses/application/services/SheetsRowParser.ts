import { err, ok, type Result } from '../../../../shared-kernel/result/Result.js';
import { InvalidSheetsRowError } from '../../domain/errors/SheetsImportErrors.js';

/**
 * Parser for the user's Google Sheets export format.
 *
 * The CSV is shaped by years of practical use, not by us:
 *   Days, Transaction Date, Out (Rp.), Description, Category, Method, Reimbursement
 *
 * Quirks the parser MUST tolerate (see `docs/domain/Expenses Apr 26 Redacted Data.csv`):
 *   • Dates in Bahasa, no year                → "23 Apr", "6 Mei", "30 Mar"  (year supplied via input)
 *   • Amounts in IDR `Rp` notation, negative  → "Rp7.630.945", "-Rp11.999.000"
 *   • Negative amount === Early Reimbursement → trust the Reimbursement column, take abs() of amount
 *   • Reimbursement values in kebab-case      → "early-reimburse" maps to "Early Reimbursement" seed name
 *   • Trailing whitespace on column headers   → normalised on intake
 *   • Trailing whitespace on cell values      → trimmed
 */

// --- Header keys (normalised: lowercased, whitespace collapsed). ---
const COL_TRANSACTION_DATE = 'transaction date';
const COL_AMOUNT = 'out (rp.)';
const COL_DESCRIPTION = 'description';
const COL_CATEGORY = 'category';
const COL_METHOD = 'method';
const COL_REIMBURSEMENT = 'reimbursement';

export const REQUIRED_COLUMNS: readonly string[] = [
  COL_TRANSACTION_DATE,
  COL_AMOUNT,
  COL_DESCRIPTION,
  COL_CATEGORY,
  COL_METHOD,
  COL_REIMBURSEMENT,
] as const;

// --- Bahasa month name → 1-indexed month. Both 3-letter and full forms supported. ---
const MONTH_NAMES: Readonly<Record<string, number>> = {
  jan: 1, januari: 1, january: 1,
  feb: 2, februari: 2, february: 2,
  mar: 3, maret: 3, march: 3,
  apr: 4, april: 4,
  mei: 5, may: 5,
  jun: 6, juni: 6, june: 6,
  jul: 7, juli: 7, july: 7,
  agu: 8, agt: 8, agustus: 8, aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  okt: 10, oct: 10, oktober: 10, october: 10,
  nov: 11, november: 11,
  des: 12, dec: 12, desember: 12, december: 12,
};

// --- Sheets reimbursement vocab (kebab-case) → canonical seed name. ---
// The seed names in CLAUDE.md are authoritative for the application; this map
// translates the user's historical vocabulary at the import boundary.
const REIMBURSEMENT_NAME_MAP: Readonly<Record<string, string>> = {
  'non-reimbursable': 'Non-Reimbursable',
  'nonreimbursable': 'Non-Reimbursable',
  'unpaid-reimbursable': 'Unpaid Reimbursable',
  'paid-reimbursable': 'Paid Reimbursable',
  'paid-reimburse': 'Paid Reimbursable',
  'early-reimbursement': 'Early Reimbursement',
  'early-reimburse': 'Early Reimbursement',
  'pending-reimbursement': 'Pending Reimbursement',
  'pending-reimburse': 'Pending Reimbursement',
  'onhold-reimbursable': 'Pending Reimbursement',
  'onhold-reimbursement': 'Pending Reimbursement',
  'on-hold': 'Pending Reimbursement',
};

export interface ParsedSheetsRow {
  /** UTC Date at midnight of (defaultYear, parsed-month, parsed-day). */
  readonly transactionDate: Date;
  /** Absolute amount in major units as a plain decimal string, e.g. "7630945". The use case feeds this through the formula evaluator. */
  readonly amountInput: string;
  readonly description: string;
  readonly categoryName: string;
  readonly methodName: string;
  /** Canonicalised name matching one of the seeded ReimbursementStatus names. */
  readonly reimbursementStatusName: string;
  /** True if the original amount cell was negative — informational; sign already encoded in `reimbursementStatusName`. */
  readonly wasNegativeAmount: boolean;
}

export interface SheetsRowInput {
  /** Map of normalised-header → cell value (already trimmed of trailing whitespace on header). */
  readonly cells: Readonly<Record<string, string>>;
  readonly defaultYear: number;
}

export function normalizeHeader(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().toLowerCase();
}

export function parseSheetsRow(
  input: SheetsRowInput,
): Result<ParsedSheetsRow, InvalidSheetsRowError> {
  const get = (key: string): string => (input.cells[key] ?? '').trim();

  const dateRaw = get(COL_TRANSACTION_DATE);
  const dateResult = parseBahasaDate(dateRaw, input.defaultYear);
  if (!dateResult.ok) return dateResult;

  const amountRaw = get(COL_AMOUNT);
  const amountResult = parseRpAmount(amountRaw);
  if (!amountResult.ok) return amountResult;

  const descriptionRaw = get(COL_DESCRIPTION);
  if (descriptionRaw.length === 0) {
    return err(
      new InvalidSheetsRowError(COL_DESCRIPTION, descriptionRaw, 'Description is empty.'),
    );
  }

  const categoryName = get(COL_CATEGORY);
  if (categoryName.length === 0) {
    return err(new InvalidSheetsRowError(COL_CATEGORY, categoryName, 'Category is empty.'));
  }

  const methodName = get(COL_METHOD);
  if (methodName.length === 0) {
    return err(new InvalidSheetsRowError(COL_METHOD, methodName, 'Method is empty.'));
  }

  const reimbursementRaw = get(COL_REIMBURSEMENT);
  if (reimbursementRaw.length === 0) {
    return err(
      new InvalidSheetsRowError(COL_REIMBURSEMENT, reimbursementRaw, 'Reimbursement is empty.'),
    );
  }
  const reimbursementStatusName = canonicaliseReimbursement(reimbursementRaw);

  return ok({
    transactionDate: dateResult.value,
    amountInput: amountResult.value.absolute,
    description: descriptionRaw,
    categoryName,
    methodName,
    reimbursementStatusName,
    wasNegativeAmount: amountResult.value.wasNegative,
  });
}

function parseBahasaDate(
  raw: string,
  defaultYear: number,
): Result<Date, InvalidSheetsRowError> {
  if (raw.length === 0) {
    return err(new InvalidSheetsRowError(COL_TRANSACTION_DATE, raw, 'Transaction date is empty.'));
  }
  if (!Number.isInteger(defaultYear) || defaultYear < 1900 || defaultYear > 9999) {
    return err(
      new InvalidSheetsRowError(
        COL_TRANSACTION_DATE,
        raw,
        `defaultYear must be a 4-digit year; got ${defaultYear}.`,
      ),
    );
  }

  const cleaned = raw.replace(/\s+/g, ' ').trim();
  const match = /^(\d{1,2})\s+([A-Za-z]+)(?:\s+(\d{4}))?$/.exec(cleaned);
  if (!match) {
    return err(
      new InvalidSheetsRowError(
        COL_TRANSACTION_DATE,
        raw,
        `Cannot parse date "${raw}". Expected "D MonthName" (e.g. "23 Apr") or "D MonthName YYYY".`,
      ),
    );
  }
  const day = Number.parseInt(match[1] ?? '', 10);
  const monthName = (match[2] ?? '').toLowerCase();
  const yearOverride = match[3] ? Number.parseInt(match[3], 10) : null;
  const month = MONTH_NAMES[monthName];
  if (month === undefined) {
    return err(
      new InvalidSheetsRowError(
        COL_TRANSACTION_DATE,
        raw,
        `Unknown month name "${monthName}". Recognised: Jan, Feb, Mar, Apr, Mei/May, Jun, Jul, Agu/Aug, Sep, Okt/Oct, Nov, Des/Dec (and full forms).`,
      ),
    );
  }

  const year = yearOverride ?? defaultYear;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return err(
      new InvalidSheetsRowError(
        COL_TRANSACTION_DATE,
        raw,
        `Date "${raw}" rolled over (e.g. 31 Feb). Resolved to ${date.toISOString().slice(0, 10)}.`,
      ),
    );
  }
  return ok(date);
}

interface RpAmount {
  /** Decimal-string representation of |amount| in major units, no thousand separators. */
  readonly absolute: string;
  readonly wasNegative: boolean;
}

function parseRpAmount(raw: string): Result<RpAmount, InvalidSheetsRowError> {
  if (raw.length === 0) {
    return err(new InvalidSheetsRowError(COL_AMOUNT, raw, 'Amount is empty.'));
  }
  // Strip Rp prefix (with optional space), zero-width chars and NBSP. Keep sign.
  const cleaned = raw
    .replace(/[ ​‌‍﻿]/g, '')
    .replace(/\s+/g, '')
    .replace(/^([-+]?)Rp\.?/i, '$1');
  if (!/^[-+]?[\d.]+$/.test(cleaned)) {
    return err(
      new InvalidSheetsRowError(
        COL_AMOUNT,
        raw,
        `Cannot parse amount "${raw}". Expected "Rp1.234.567" or "-Rp1.234.567" notation.`,
      ),
    );
  }
  const wasNegative = cleaned.startsWith('-');
  const unsigned = cleaned.replace(/^[-+]/, '');
  // IDR uses '.' as thousand separator; with 0 decimal places there is no
  // decimal point semantically. Strip the dots; any leftover sub-unit part
  // would be ambiguous and we treat the whole digit string as major units.
  const digits = unsigned.replace(/\./g, '');
  if (digits.length === 0 || !/^\d+$/.test(digits)) {
    return err(
      new InvalidSheetsRowError(
        COL_AMOUNT,
        raw,
        `Cannot parse amount "${raw}". Expected digits after stripping "Rp" and dot separators.`,
      ),
    );
  }
  if (digits === '0' || /^0+$/.test(digits)) {
    return err(
      new InvalidSheetsRowError(COL_AMOUNT, raw, 'Amount must be greater than zero.'),
    );
  }
  // Strip leading zeros for canonical form.
  const normalised = digits.replace(/^0+/, '');
  return ok({ absolute: normalised, wasNegative });
}

function canonicaliseReimbursement(raw: string): string {
  // Lowercase, collapse internal whitespace to single dashes, strip trailing dots.
  const key = raw
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const mapped = REIMBURSEMENT_NAME_MAP[key];
  if (mapped !== undefined) return mapped;
  // Not in the kebab-case translation table — return the trimmed original for
  // the lookup layer to resolve (or fuzzy-suggest against existing names).
  return raw.trim();
}
