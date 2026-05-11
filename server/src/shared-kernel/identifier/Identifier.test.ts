import { describe, expect, it } from 'vitest';
import { type Id, isUuidV4, makeIdFactory } from './Identifier.js';

describe('Identifier', () => {
  describe('isUuidV4', () => {
    it('accepts valid v4 UUIDs', () => {
      expect(isUuidV4('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(isUuidV4('123E4567-E89B-42D3-A456-426614174000')).toBe(true);
    });

    it('rejects non-v4 UUIDs and bad strings', () => {
      expect(isUuidV4('550e8400-e29b-11d4-a716-446655440000')).toBe(false); // v1
      expect(isUuidV4('not-a-uuid')).toBe(false);
      expect(isUuidV4('')).toBe(false);
      expect(isUuidV4('550e8400e29b41d4a716446655440000')).toBe(false); // missing dashes
    });
  });

  describe('makeIdFactory', () => {
    it('creates branded ids that pass validation', () => {
      type ExpenseId = Id<'ExpenseId'>;
      const ExpenseId = makeIdFactory<'ExpenseId'>('ExpenseId');
      const id: ExpenseId = ExpenseId.create('550e8400-e29b-41d4-a716-446655440000');
      expect(id).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('throws on invalid raw', () => {
      const Factory = makeIdFactory('Foo');
      expect(() => Factory.create('nope')).toThrow(RangeError);
    });

    it('isValid mirrors the validator', () => {
      const Factory = makeIdFactory('Foo');
      expect(Factory.isValid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(Factory.isValid('garbage')).toBe(false);
    });

    it('accepts a custom validator', () => {
      const Factory = makeIdFactory('NumericId', (raw) => /^\d+$/.test(raw));
      expect(Factory.create('12345')).toBe('12345');
      expect(() => Factory.create('abc')).toThrow(RangeError);
    });

    it('different brands are not interchangeable at the type level', () => {
      // This test mostly documents the intended type-level behavior; runtime equality is plain string.
      const A = makeIdFactory<'A'>('A');
      const B = makeIdFactory<'B'>('B');
      const a = A.create('550e8400-e29b-41d4-a716-446655440000');
      const b = B.create('550e8400-e29b-41d4-a716-446655440000');
      // @ts-expect-error — A and B are distinct branded types
      const _wrong: typeof a = b;
      expect(typeof a).toBe('string');
      expect(typeof b).toBe('string');
    });
  });
});
