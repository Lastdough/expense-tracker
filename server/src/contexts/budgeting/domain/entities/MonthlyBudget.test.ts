import { describe, expect, it } from 'vitest';
import { Money } from '../../../../shared-kernel/money/Money.js';
import { MonthlyBudget } from './MonthlyBudget.js';

const idr = (n: bigint) => Money.fromMinor(n, 'IDR');

describe('MonthlyBudget', () => {
  const NOW = new Date('2026-05-17T10:00:00.000Z');
  const LATER = new Date('2026-05-17T11:00:00.000Z');

  describe('create', () => {
    it('builds an aggregate with createdAt = updatedAt = now', () => {
      const b = MonthlyBudget.create({ amount: idr(5_000_000n), now: NOW });
      expect(b.amount.equals(idr(5_000_000n))).toBe(true);
      expect(b.createdAt).toBe(NOW);
      expect(b.updatedAt).toBe(NOW);
    });

    it('accepts zero', () => {
      const b = MonthlyBudget.create({ amount: idr(0n), now: NOW });
      expect(b.amount.isZero()).toBe(true);
    });

    it('rejects a negative amount', () => {
      expect(() => MonthlyBudget.create({ amount: idr(-1n), now: NOW })).toThrow(RangeError);
    });

    it('rejects an invalid now', () => {
      expect(() =>
        MonthlyBudget.create({ amount: idr(1n), now: new Date('not a date') }),
      ).toThrow(RangeError);
    });
  });

  describe('rehydrate', () => {
    it('builds an aggregate preserving timestamps', () => {
      const b = MonthlyBudget.rehydrate({
        amount: idr(5_000_000n),
        createdAt: NOW,
        updatedAt: LATER,
      });
      expect(b.createdAt).toBe(NOW);
      expect(b.updatedAt).toBe(LATER);
    });
  });

  describe('change', () => {
    it('updates the amount and bumps updatedAt', () => {
      const b = MonthlyBudget.create({ amount: idr(5_000_000n), now: NOW });
      b.change(idr(7_500_000n), LATER);
      expect(b.amount.equals(idr(7_500_000n))).toBe(true);
      expect(b.updatedAt).toBe(LATER);
      expect(b.createdAt).toBe(NOW); // unchanged
    });

    it('rejects a negative amount and leaves the aggregate untouched', () => {
      const b = MonthlyBudget.create({ amount: idr(5_000_000n), now: NOW });
      expect(() => b.change(idr(-1n), LATER)).toThrow(RangeError);
      expect(b.amount.equals(idr(5_000_000n))).toBe(true);
      expect(b.updatedAt).toBe(NOW);
    });
  });
});
