import { describe, expect, it } from 'vitest';
import { Money } from './Money.js';
import { currencyLocale, formatMajor, formatMoney } from './format.js';

// Most assertions match against a parallel `Intl.NumberFormat` call so the
// suite is robust against ICU-version differences (whitespace chars, exact
// symbol placement). A small number of literal-string regression tests pin
// the user-visible IDR rendering — that's the one we actually care about.

function refCurrency(amount: number, currency: 'IDR' | 'USD' | 'EUR' | 'JPY' | 'GBP' | 'SGD' | 'AUD', decimals: number): string {
  return new Intl.NumberFormat(currencyLocale(currency), {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

describe('currencyLocale', () => {
  it('returns id-ID for IDR', () => {
    expect(currencyLocale('IDR')).toBe('id-ID');
  });
  it('returns en-US for USD', () => {
    expect(currencyLocale('USD')).toBe('en-US');
  });
});

describe('formatMoney', () => {
  it('formats IDR with period as thousands separator (id-ID locale)', () => {
    // Regression guard — this is the user-visible drift we just fixed.
    expect(formatMoney(Money.fromMinor(100000n, 'IDR'))).toContain('100.000');
    expect(formatMoney(Money.fromMinor(1234567n, 'IDR'))).toContain('1.234.567');
  });

  it('formats IDR with no fractional digits', () => {
    expect(formatMoney(Money.fromMinor(100000n, 'IDR'))).toBe(refCurrency(100000, 'IDR', 0));
  });

  it('formats USD with two fractional digits', () => {
    expect(formatMoney(Money.fromMinor(12345n, 'USD'))).toBe(refCurrency(123.45, 'USD', 2));
  });

  it('formats JPY with no fractional digits', () => {
    expect(formatMoney(Money.fromMinor(1000n, 'JPY'))).toBe(refCurrency(1000, 'JPY', 0));
  });

  it('formats negative IDR', () => {
    expect(formatMoney(Money.fromMinor(-100000n, 'IDR'))).toBe(refCurrency(-100000, 'IDR', 0));
  });

  it('formats negative USD', () => {
    expect(formatMoney(Money.fromMinor(-150n, 'USD'))).toBe(refCurrency(-1.5, 'USD', 2));
  });

  it('formats zero with the right precision', () => {
    expect(formatMoney(Money.zero('IDR'))).toBe(refCurrency(0, 'IDR', 0));
    expect(formatMoney(Money.zero('USD'))).toBe(refCurrency(0, 'USD', 2));
  });

  it('handles very large IDR amounts without precision loss', () => {
    // 1e12 IDR is well within Number.MAX_SAFE_INTEGER for the major-unit value.
    expect(formatMoney(Money.fromMinor(1_000_000_000_000n, 'IDR'))).toBe(
      refCurrency(1e12, 'IDR', 0),
    );
  });
});

describe('formatMajor', () => {
  it('formats a major-string IDR amount with period thousands', () => {
    expect(formatMajor('1234567', 'IDR')).toContain('1.234.567');
  });

  it('falls back to the raw input for non-numeric strings', () => {
    expect(formatMajor('not-a-number', 'IDR')).toBe('not-a-number');
  });
});
