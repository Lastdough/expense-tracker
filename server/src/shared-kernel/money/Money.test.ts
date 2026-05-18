import { describe, expect, it } from 'vitest';
import { CurrencyMismatchError, Money } from './Money.js';

describe('Money', () => {
  describe('fromMinor', () => {
    it('accepts bigint', () => {
      const m = Money.fromMinor(150n, 'USD');
      expect(m.amount).toBe(150n);
      expect(m.currency).toBe('USD');
    });

    it('accepts safe-integer numbers', () => {
      const m = Money.fromMinor(150, 'USD');
      expect(m.amount).toBe(150n);
    });

    it('rejects non-safe-integer numbers', () => {
      expect(() => Money.fromMinor(1.5, 'USD')).toThrow(TypeError);
      expect(() => Money.fromMinor(Number.MAX_SAFE_INTEGER + 1, 'USD')).toThrow(TypeError);
    });

    it('handles very large bigint amounts (overflow safety)', () => {
      const huge = 10n ** 30n; // far beyond Number.MAX_SAFE_INTEGER
      const m = Money.fromMinor(huge, 'IDR');
      expect(m.amount).toBe(huge);
      expect(m.add(Money.fromMinor(1n, 'IDR')).amount).toBe(huge + 1n);
    });
  });

  describe('fromMajor', () => {
    it('parses integer amounts for IDR (0 minor units)', () => {
      const m = Money.fromMajor('100000', 'IDR');
      expect(m.amount).toBe(100000n);
    });

    it('parses decimal amounts for USD (2 minor units)', () => {
      expect(Money.fromMajor('1.50', 'USD').amount).toBe(150n);
      expect(Money.fromMajor('0.05', 'USD').amount).toBe(5n);
      expect(Money.fromMajor('1234.56', 'USD').amount).toBe(123456n);
    });

    it('pads fractional digits to the currency minor-unit count', () => {
      expect(Money.fromMajor('1.5', 'USD').amount).toBe(150n);
      expect(Money.fromMajor('1', 'USD').amount).toBe(100n);
    });

    it('rejects fractional digits for zero-minor-unit currencies', () => {
      expect(() => Money.fromMajor('100.5', 'IDR')).toThrow(RangeError);
      expect(() => Money.fromMajor('100.5', 'JPY')).toThrow(RangeError);
    });

    it('rejects more fractional digits than the currency allows', () => {
      expect(() => Money.fromMajor('1.500', 'USD')).toThrow(RangeError);
      expect(() => Money.fromMajor('1.123', 'EUR')).toThrow(RangeError);
    });

    it('rejects malformed numeric strings', () => {
      expect(() => Money.fromMajor('abc', 'USD')).toThrow(RangeError);
      expect(() => Money.fromMajor('1.2.3', 'USD')).toThrow(RangeError);
      expect(() => Money.fromMajor('', 'USD')).toThrow(RangeError);
      expect(() => Money.fromMajor('1e5', 'USD')).toThrow(RangeError); // no scientific notation
      expect(() => Money.fromMajor('+1', 'USD')).toThrow(RangeError); // no leading +
      expect(() => Money.fromMajor('.5', 'USD')).toThrow(RangeError); // require leading digit
    });

    it('parses negative amounts', () => {
      expect(Money.fromMajor('-1.50', 'USD').amount).toBe(-150n);
      expect(Money.fromMajor('-100', 'IDR').amount).toBe(-100n);
    });

    it('trims whitespace', () => {
      expect(Money.fromMajor('  1.50  ', 'USD').amount).toBe(150n);
    });
  });

  describe('arithmetic', () => {
    it('add: same currency', () => {
      const result = Money.fromMinor(100n, 'IDR').add(Money.fromMinor(50n, 'IDR'));
      expect(result.amount).toBe(150n);
      expect(result.currency).toBe('IDR');
    });

    it('add: throws on currency mismatch', () => {
      expect(() => Money.fromMinor(100n, 'IDR').add(Money.fromMinor(50n, 'USD'))).toThrow(
        CurrencyMismatchError,
      );
    });

    it('subtract: same currency, negative result allowed', () => {
      const result = Money.fromMinor(50n, 'USD').subtract(Money.fromMinor(80n, 'USD'));
      expect(result.amount).toBe(-30n);
      expect(result.isNegative()).toBe(true);
    });

    it('subtract: throws on currency mismatch', () => {
      expect(() => Money.fromMinor(100n, 'IDR').subtract(Money.fromMinor(50n, 'USD'))).toThrow(
        CurrencyMismatchError,
      );
    });

    it('multiply: by integer number', () => {
      const result = Money.fromMinor(20000n, 'IDR').multiply(5);
      expect(result.amount).toBe(100000n);
    });

    it('multiply: by bigint', () => {
      const result = Money.fromMinor(100n, 'USD').multiply(10n);
      expect(result.amount).toBe(1000n);
    });

    it('multiply: by zero produces zero', () => {
      expect(Money.fromMinor(123n, 'USD').multiply(0).amount).toBe(0n);
    });

    it('multiply: by negative integer flips sign', () => {
      expect(Money.fromMinor(100n, 'USD').multiply(-2).amount).toBe(-200n);
    });

    it('multiply: rejects non-integer number scalars', () => {
      expect(() => Money.fromMinor(100n, 'USD').multiply(1.5)).toThrow(TypeError);
    });

    it('negate flips sign', () => {
      expect(Money.fromMinor(100n, 'USD').negate().amount).toBe(-100n);
      expect(Money.fromMinor(-50n, 'USD').negate().amount).toBe(50n);
      expect(Money.fromMinor(0n, 'USD').negate().amount).toBe(0n);
    });

    it('abs returns the magnitude', () => {
      expect(Money.fromMinor(-100n, 'USD').abs().amount).toBe(100n);
      expect(Money.fromMinor(100n, 'USD').abs().amount).toBe(100n);
      expect(Money.fromMinor(0n, 'USD').abs().amount).toBe(0n);
    });

    it('arithmetic does not mutate the original', () => {
      const a = Money.fromMinor(100n, 'USD');
      const b = Money.fromMinor(50n, 'USD');
      a.add(b);
      a.subtract(b);
      a.multiply(2);
      a.negate();
      expect(a.amount).toBe(100n);
    });
  });

  describe('comparison', () => {
    it('equals: same currency and amount', () => {
      expect(Money.fromMinor(100n, 'USD').equals(Money.fromMinor(100n, 'USD'))).toBe(true);
    });

    it('equals: different amounts', () => {
      expect(Money.fromMinor(100n, 'USD').equals(Money.fromMinor(101n, 'USD'))).toBe(false);
    });

    it('equals: different currencies returns false (does not throw)', () => {
      expect(Money.fromMinor(100n, 'USD').equals(Money.fromMinor(100n, 'IDR'))).toBe(false);
    });

    it('compare: returns -1, 0, 1', () => {
      const a = Money.fromMinor(100n, 'USD');
      const b = Money.fromMinor(200n, 'USD');
      expect(a.compare(b)).toBe(-1);
      expect(b.compare(a)).toBe(1);
      expect(a.compare(Money.fromMinor(100n, 'USD'))).toBe(0);
    });

    it('compare: throws on currency mismatch', () => {
      expect(() => Money.fromMinor(100n, 'USD').compare(Money.fromMinor(100n, 'IDR'))).toThrow(
        CurrencyMismatchError,
      );
    });

    it('isZero / isPositive / isNegative', () => {
      const zero = Money.zero('USD');
      const pos = Money.fromMinor(1n, 'USD');
      const neg = Money.fromMinor(-1n, 'USD');
      expect(zero.isZero()).toBe(true);
      expect(zero.isPositive()).toBe(false);
      expect(zero.isNegative()).toBe(false);
      expect(pos.isPositive()).toBe(true);
      expect(neg.isNegative()).toBe(true);
    });
  });

  describe('toMajor', () => {
    it('round-trips fromMajor / toMajor for typical values', () => {
      expect(Money.fromMajor('1234.56', 'USD').toMajor()).toBe('1234.56');
      expect(Money.fromMajor('100000', 'IDR').toMajor()).toBe('100000');
      expect(Money.fromMajor('0.05', 'USD').toMajor()).toBe('0.05');
      expect(Money.fromMajor('-99.99', 'EUR').toMajor()).toBe('-99.99');
    });
  });
});
