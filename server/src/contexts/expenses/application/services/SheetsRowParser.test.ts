import { describe, expect, it } from 'vitest';
import {
  normalizeHeader,
  parseSheetsRow,
  REQUIRED_COLUMNS,
} from './SheetsRowParser.js';

const REQ = REQUIRED_COLUMNS;

function row(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    [REQ[0] as string]: '23 Apr',
    [REQ[1] as string]: 'Rp95.000',
    [REQ[2] as string]: 'Coffee',
    [REQ[3] as string]: 'Food',
    [REQ[4] as string]: 'Gopay',
    [REQ[5] as string]: 'non-reimbursable',
    ...overrides,
  };
}

describe('normalizeHeader', () => {
  it('lowercases and trims trailing whitespace', () => {
    expect(normalizeHeader('Reimbursement ')).toBe('reimbursement');
    expect(normalizeHeader('  Transaction Date  ')).toBe('transaction date');
    expect(normalizeHeader('Out (Rp.)')).toBe('out (rp.)');
  });
});

describe('parseSheetsRow — happy path', () => {
  it('parses the canonical row from the redacted CSV', () => {
    const r = parseSheetsRow({ cells: row(), defaultYear: 2025 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.transactionDate.toISOString().slice(0, 10)).toBe('2025-04-23');
    expect(r.value.amountInput).toBe('95000');
    expect(r.value.description).toBe('Coffee');
    expect(r.value.categoryName).toBe('Food');
    expect(r.value.methodName).toBe('Gopay');
    expect(r.value.reimbursementStatusName).toBe('Non-Reimbursable');
    expect(r.value.wasNegativeAmount).toBe(false);
  });

  it('parses Bahasa month "Mei" → 2025-05', () => {
    const r = parseSheetsRow({
      cells: row({ [REQ[0] as string]: '6 Mei' }),
      defaultYear: 2025,
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.transactionDate.toISOString().slice(0, 10)).toBe('2025-05-06');
  });

  it('parses Bahasa month "Mar" → 2025-03', () => {
    const r = parseSheetsRow({
      cells: row({ [REQ[0] as string]: '30 Mar' }),
      defaultYear: 2025,
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.transactionDate.toISOString().slice(0, 10)).toBe('2025-03-30');
  });

  it('parses Indonesian thousand-separator "Rp7.630.945"', () => {
    const r = parseSheetsRow({
      cells: row({ [REQ[1] as string]: 'Rp7.630.945' }),
      defaultYear: 2025,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.amountInput).toBe('7630945');
      expect(r.value.wasNegativeAmount).toBe(false);
    }
  });

  it('parses negative amount and reports wasNegativeAmount', () => {
    const r = parseSheetsRow({
      cells: row({
        [REQ[1] as string]: '-Rp11.999.000',
        [REQ[5] as string]: 'early-reimburse',
      }),
      defaultYear: 2025,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.amountInput).toBe('11999000');
      expect(r.value.wasNegativeAmount).toBe(true);
      expect(r.value.reimbursementStatusName).toBe('Early Reimbursement');
    }
  });

  it('canonicalises kebab-case reimbursement values', () => {
    const cases: Array<[string, string]> = [
      ['non-reimbursable', 'Non-Reimbursable'],
      ['unpaid-reimbursable', 'Unpaid Reimbursable'],
      ['early-reimburse', 'Early Reimbursement'],
      ['paid-reimburse', 'Paid Reimbursable'],
      ['onhold-reimbursable', 'Pending Reimbursement'],
      ['pending-reimbursement', 'Pending Reimbursement'],
    ];
    for (const [input, expected] of cases) {
      const r = parseSheetsRow({
        cells: row({ [REQ[5] as string]: input }),
        defaultYear: 2025,
      });
      expect(r.ok, `failed for input ${input}`).toBe(true);
      if (r.ok) expect(r.value.reimbursementStatusName).toBe(expected);
    }
  });

  it('passes through unknown reimbursement names verbatim for downstream fuzzy match', () => {
    const r = parseSheetsRow({
      cells: row({ [REQ[5] as string]: 'completely-made-up-status' }),
      defaultYear: 2025,
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.reimbursementStatusName).toBe('completely-made-up-status');
  });

  it('trims trailing whitespace on cell values (matches "Healthcare " on row 103)', () => {
    const r = parseSheetsRow({
      cells: row({ [REQ[3] as string]: 'Healthcare ' }),
      defaultYear: 2025,
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.categoryName).toBe('Healthcare');
  });

  it('accepts explicit year override in the date cell', () => {
    const r = parseSheetsRow({
      cells: row({ [REQ[0] as string]: '23 Apr 2024' }),
      defaultYear: 2026,
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.transactionDate.toISOString().slice(0, 10)).toBe('2024-04-23');
  });
});

describe('parseSheetsRow — errors', () => {
  it('rejects empty date', () => {
    const r = parseSheetsRow({ cells: row({ [REQ[0] as string]: '' }), defaultYear: 2025 });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('invalid_sheets_row');
      expect(r.error.field).toBe('transaction date');
    }
  });

  it('rejects malformed date', () => {
    const r = parseSheetsRow({
      cells: row({ [REQ[0] as string]: 'tomorrow' }),
      defaultYear: 2025,
    });
    expect(r.ok).toBe(false);
  });

  it('rejects unknown month name', () => {
    const r = parseSheetsRow({
      cells: row({ [REQ[0] as string]: '23 Foo' }),
      defaultYear: 2025,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.message).toContain('Unknown month name');
  });

  it('rejects rolled-over date like 31 Feb', () => {
    const r = parseSheetsRow({
      cells: row({ [REQ[0] as string]: '31 Feb' }),
      defaultYear: 2025,
    });
    expect(r.ok).toBe(false);
  });

  it('rejects zero amount', () => {
    const r = parseSheetsRow({
      cells: row({ [REQ[1] as string]: 'Rp0' }),
      defaultYear: 2025,
    });
    expect(r.ok).toBe(false);
  });

  it('rejects non-numeric amount', () => {
    const r = parseSheetsRow({
      cells: row({ [REQ[1] as string]: 'abc' }),
      defaultYear: 2025,
    });
    expect(r.ok).toBe(false);
  });

  it('rejects amount with letters mid-string', () => {
    const r = parseSheetsRow({
      cells: row({ [REQ[1] as string]: 'Rp1.2x3' }),
      defaultYear: 2025,
    });
    expect(r.ok).toBe(false);
  });

  it('rejects empty description', () => {
    const r = parseSheetsRow({ cells: row({ [REQ[2] as string]: '' }), defaultYear: 2025 });
    expect(r.ok).toBe(false);
  });

  it('rejects empty category', () => {
    const r = parseSheetsRow({ cells: row({ [REQ[3] as string]: '' }), defaultYear: 2025 });
    expect(r.ok).toBe(false);
  });

  it('rejects invalid defaultYear', () => {
    const r = parseSheetsRow({ cells: row(), defaultYear: 99 });
    expect(r.ok).toBe(false);
  });
});
