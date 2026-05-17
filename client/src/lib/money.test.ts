import { describe, expect, it } from 'vitest';
import { currencyDecimals, formatMoney } from './money';

// Tests compare against Intl.NumberFormat with explicit options so they pass
// regardless of the test runner's host locale (which controls separator chars).

function refFormat(amount: number, currency: string, decimals: number): string {
  return new Intl.NumberFormat(undefined, {
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
