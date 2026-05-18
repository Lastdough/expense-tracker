import { describe, expect, it } from 'vitest';
import {
  currencyDecimals,
  currencyLocale,
  extractRawAmount,
  formatAmountInput,
  formatMoney,
  thousandSeparator,
} from './money';

// Tests compare against Intl.NumberFormat with the same per-currency locale
// the formatter uses, so they pass regardless of the test runner's host locale.

function refFormat(amount: number, currency: string, decimals: number): string {
  return new Intl.NumberFormat(currencyLocale(currency), {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

describe('currencyDecimals', () => {
  it('returns 0 for zero-decimal currencies', () => {
    expect(currencyDecimals('IDR')).toBe(0);
    expect(currencyDecimals('JPY')).toBe(0);
    expect(currencyDecimals('idr')).toBe(0);
  });
  it('returns 2 for standard currencies', () => {
    expect(currencyDecimals('USD')).toBe(2);
    expect(currencyDecimals('EUR')).toBe(2);
    expect(currencyDecimals('GBP')).toBe(2);
  });
});

describe('formatMoney', () => {
  it('formats IDR with no fractional digits', () => {
    const out = formatMoney({ amountMinor: 100000n, currency: 'IDR' });
    expect(out).toBe(refFormat(100000, 'IDR', 0));
  });

  it('formats IDR with period as thousands separator (id-ID locale)', () => {
    // Regression guard: don't let host locale leak into IDR rendering.
    expect(formatMoney({ amountMinor: 1234567n, currency: 'IDR' })).toContain('1.234.567');
  });

  it('formats USD with two fractional digits', () => {
    const out = formatMoney({ amountMinor: 12345n, currency: 'USD' });
    expect(out).toBe(refFormat(123.45, 'USD', 2));
  });

  it('accepts a numeric input (IDR)', () => {
    expect(formatMoney({ amountMinor: 5000, currency: 'IDR' })).toBe(refFormat(5000, 'IDR', 0));
  });

  it('accepts a string input (IDR)', () => {
    expect(formatMoney({ amountMinor: '99000', currency: 'IDR' })).toBe(refFormat(99000, 'IDR', 0));
  });

  it('formats negative IDR', () => {
    expect(formatMoney({ amountMinor: -50000n, currency: 'IDR' })).toBe(refFormat(-50000, 'IDR', 0));
  });

  it('handles very large amounts (1e12 IDR) without precision loss', () => {
    const big = 1_000_000_000_000n;
    expect(formatMoney({ amountMinor: big, currency: 'IDR' })).toBe(refFormat(1e12, 'IDR', 0));
  });

  it('formats USD fractions correctly across the decimal boundary', () => {
    expect(formatMoney({ amountMinor: 99n, currency: 'USD' })).toBe(refFormat(0.99, 'USD', 2));
    expect(formatMoney({ amountMinor: 100n, currency: 'USD' })).toBe(refFormat(1.0, 'USD', 2));
    expect(formatMoney({ amountMinor: 101n, currency: 'USD' })).toBe(refFormat(1.01, 'USD', 2));
  });
});

describe('thousandSeparator', () => {
  it('returns "." for IDR (id-ID)', () => {
    expect(thousandSeparator('IDR')).toBe('.');
  });
  it('returns "," for USD (en-US)', () => {
    expect(thousandSeparator('USD')).toBe(',');
  });
});

describe('formatAmountInput', () => {
  it('formats a raw IDR digit string with period thousands', () => {
    expect(formatAmountInput('100000', 'IDR')).toBe('100.000');
    expect(formatAmountInput('1234567', 'IDR')).toBe('1.234.567');
  });

  it('passes formulas through unchanged', () => {
    expect(formatAmountInput('=20000*5', 'IDR')).toBe('=20000*5');
    expect(formatAmountInput('=', 'IDR')).toBe('=');
  });

  it('strips non-digit noise from pasted input', () => {
    expect(formatAmountInput('Rp 100,000', 'IDR')).toBe('100.000');
    expect(formatAmountInput('1abc2def3', 'IDR')).toBe('123');
  });

  it('returns the empty string for empty input', () => {
    expect(formatAmountInput('', 'IDR')).toBe('');
    expect(formatAmountInput('abc', 'IDR')).toBe('');
  });

  it('is idempotent — formatting twice returns the same string', () => {
    const once = formatAmountInput('1234567', 'IDR');
    expect(formatAmountInput(once, 'IDR')).toBe(once);
  });

  it('handles very large IDR amounts via BigInt without precision loss', () => {
    expect(formatAmountInput('999999999999999999', 'IDR')).toBe('999.999.999.999.999.999');
  });
});

describe('extractRawAmount', () => {
  it('strips IDR thousand separators', () => {
    expect(extractRawAmount('100.000', 'IDR')).toBe('100000');
    expect(extractRawAmount('1.234.567', 'IDR')).toBe('1234567');
  });

  it('passes formulas through unchanged', () => {
    expect(extractRawAmount('=20000*5', 'IDR')).toBe('=20000*5');
  });

  it('strips USD thousand separators (commas), leaves decimal point alone', () => {
    expect(extractRawAmount('1,234.56', 'USD')).toBe('1234.56');
  });

  it('is a no-op on plain digits', () => {
    expect(extractRawAmount('100000', 'IDR')).toBe('100000');
  });

  it('round-trips with formatAmountInput', () => {
    const raw = '1234567';
    const display = formatAmountInput(raw, 'IDR');
    expect(extractRawAmount(display, 'IDR')).toBe(raw);
  });
});
