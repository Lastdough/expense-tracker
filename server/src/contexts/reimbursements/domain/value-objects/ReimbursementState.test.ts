import { describe, expect, it } from 'vitest';
import {
  canTransitionTo,
  earlyReimbursement,
  equals,
  markAsEarly,
  markAsNonReimbursable,
  markAsPaid,
  markAsPending,
  markAsUnpaid,
  nonReimbursable,
  paidReimbursable,
  pendingReimbursement,
  unpaidReimbursable,
  type ReimbursementState,
} from './ReimbursementState.js';
import { IllegalTransitionError } from '../errors/ReimbursementErrors.js';

const DATE_A = new Date('2026-05-17T12:00:00.000Z');
const DATE_B = new Date('2026-06-01T09:30:00.000Z');

// All five states, keyed by kind for matrix-style tests.
const STATES: Record<string, () => ReimbursementState> = {
  NonReimbursable: () => nonReimbursable(),
  UnpaidReimbursable: () => unpaidReimbursable(),
  PendingReimbursement: () => pendingReimbursement(),
  EarlyReimbursement: () => earlyReimbursement(DATE_A),
  PaidReimbursable: () => paidReimbursable(DATE_A),
};

const LEGAL_MATRIX: Record<string, ReadonlyArray<string>> = {
  NonReimbursable: [],
  UnpaidReimbursable: [
    'PendingReimbursement',
    'EarlyReimbursement',
    'PaidReimbursable',
    'NonReimbursable',
  ],
  PendingReimbursement: ['UnpaidReimbursable', 'EarlyReimbursement', 'PaidReimbursable'],
  EarlyReimbursement: ['UnpaidReimbursable', 'PendingReimbursement', 'PaidReimbursable'],
  PaidReimbursable: [],
};

describe('ReimbursementState — constructors', () => {
  it('builds each variant', () => {
    expect(nonReimbursable().kind).toBe('NonReimbursable');
    expect(unpaidReimbursable().kind).toBe('UnpaidReimbursable');
    expect(pendingReimbursement().kind).toBe('PendingReimbursement');
    expect(paidReimbursable(DATE_A)).toEqual({ kind: 'PaidReimbursable', paidAt: DATE_A });
    expect(earlyReimbursement(DATE_A)).toEqual({
      kind: 'EarlyReimbursement',
      receivedAt: DATE_A,
    });
  });

  it('rejects NaN dates in PaidReimbursable / EarlyReimbursement', () => {
    expect(() => paidReimbursable(new Date(Number.NaN))).toThrow(RangeError);
    expect(() => earlyReimbursement(new Date(Number.NaN))).toThrow(RangeError);
  });
});

describe('ReimbursementState — canTransitionTo (full 5×5)', () => {
  for (const fromKind of Object.keys(STATES)) {
    for (const toKind of Object.keys(STATES)) {
      const legal = LEGAL_MATRIX[fromKind]!.includes(toKind);
      it(`${fromKind} → ${toKind} = ${legal ? 'legal' : 'illegal'}`, () => {
        const state = STATES[fromKind]!();
        expect(canTransitionTo(state, toKind as never)).toBe(legal);
      });
    }
  }
});

describe('ReimbursementState — transition functions', () => {
  describe('markAsPaid', () => {
    it('succeeds from UnpaidReimbursable / PendingReimbursement / EarlyReimbursement', () => {
      for (const fromKind of ['UnpaidReimbursable', 'PendingReimbursement', 'EarlyReimbursement']) {
        const r = markAsPaid(STATES[fromKind]!(), DATE_B);
        expect(r.ok).toBe(true);
        if (r.ok) expect(r.value).toEqual({ kind: 'PaidReimbursable', paidAt: DATE_B });
      }
    });
    it('errors from NonReimbursable / PaidReimbursable', () => {
      for (const fromKind of ['NonReimbursable', 'PaidReimbursable']) {
        const r = markAsPaid(STATES[fromKind]!(), DATE_B);
        expect(r.ok).toBe(false);
        if (!r.ok) {
          expect(r.error).toBeInstanceOf(IllegalTransitionError);
          expect(r.error.code).toBe('illegal_transition');
        }
      }
    });
    it('returns invalid_reimbursement_date for NaN paidAt (transition was legal)', () => {
      const r = markAsPaid(unpaidReimbursable(), new Date(Number.NaN));
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.code).toBe('invalid_reimbursement_date');
    });
  });

  describe('markAsEarly', () => {
    it('succeeds from UnpaidReimbursable / PendingReimbursement', () => {
      for (const fromKind of ['UnpaidReimbursable', 'PendingReimbursement']) {
        const r = markAsEarly(STATES[fromKind]!(), DATE_B);
        expect(r.ok).toBe(true);
        if (r.ok) expect(r.value).toEqual({ kind: 'EarlyReimbursement', receivedAt: DATE_B });
      }
    });
    it('errors from NonReimbursable / EarlyReimbursement / PaidReimbursable', () => {
      for (const fromKind of ['NonReimbursable', 'EarlyReimbursement', 'PaidReimbursable']) {
        const r = markAsEarly(STATES[fromKind]!(), DATE_B);
        expect(r.ok).toBe(false);
      }
    });
    it('returns invalid_reimbursement_date for NaN receivedAt', () => {
      const r = markAsEarly(unpaidReimbursable(), new Date(Number.NaN));
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.code).toBe('invalid_reimbursement_date');
    });
  });

  describe('markAsPending', () => {
    it('succeeds from UnpaidReimbursable / EarlyReimbursement', () => {
      for (const fromKind of ['UnpaidReimbursable', 'EarlyReimbursement']) {
        const r = markAsPending(STATES[fromKind]!());
        expect(r.ok).toBe(true);
        if (r.ok) expect(r.value).toEqual({ kind: 'PendingReimbursement' });
      }
    });
    it('errors from NonReimbursable / PendingReimbursement / PaidReimbursable', () => {
      for (const fromKind of ['NonReimbursable', 'PendingReimbursement', 'PaidReimbursable']) {
        const r = markAsPending(STATES[fromKind]!());
        expect(r.ok).toBe(false);
      }
    });
  });

  describe('markAsUnpaid', () => {
    it('succeeds from PendingReimbursement / EarlyReimbursement', () => {
      for (const fromKind of ['PendingReimbursement', 'EarlyReimbursement']) {
        const r = markAsUnpaid(STATES[fromKind]!());
        expect(r.ok).toBe(true);
        if (r.ok) expect(r.value).toEqual({ kind: 'UnpaidReimbursable' });
      }
    });
    it('errors from NonReimbursable / UnpaidReimbursable / PaidReimbursable', () => {
      for (const fromKind of ['NonReimbursable', 'UnpaidReimbursable', 'PaidReimbursable']) {
        const r = markAsUnpaid(STATES[fromKind]!());
        expect(r.ok).toBe(false);
      }
    });
  });

  describe('markAsNonReimbursable', () => {
    it('succeeds only from UnpaidReimbursable', () => {
      const r = markAsNonReimbursable(unpaidReimbursable());
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toEqual({ kind: 'NonReimbursable' });
    });
    it('errors from every other state', () => {
      for (const fromKind of [
        'NonReimbursable',
        'PendingReimbursement',
        'EarlyReimbursement',
        'PaidReimbursable',
      ]) {
        const r = markAsNonReimbursable(STATES[fromKind]!());
        expect(r.ok).toBe(false);
      }
    });
  });
});

describe('ReimbursementState — equals', () => {
  it('compares by kind for date-less variants', () => {
    expect(equals(nonReimbursable(), nonReimbursable())).toBe(true);
    expect(equals(unpaidReimbursable(), pendingReimbursement())).toBe(false);
  });
  it('compares by date for PaidReimbursable / EarlyReimbursement', () => {
    expect(equals(paidReimbursable(DATE_A), paidReimbursable(DATE_A))).toBe(true);
    expect(equals(paidReimbursable(DATE_A), paidReimbursable(DATE_B))).toBe(false);
    expect(equals(earlyReimbursement(DATE_A), earlyReimbursement(DATE_A))).toBe(true);
    expect(equals(earlyReimbursement(DATE_A), earlyReimbursement(DATE_B))).toBe(false);
  });
});
