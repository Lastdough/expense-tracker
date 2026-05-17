import { describe, expect, it } from 'vitest';
import { Reimbursement } from './Reimbursement.js';
import { ReimbursementId } from '../value-objects/ReimbursementId.js';
import { ExpenseRef } from '../value-objects/ExpenseRef.js';
import {
  earlyReimbursement,
  nonReimbursable,
  paidReimbursable,
  pendingReimbursement,
  unpaidReimbursable,
  type ReimbursementState,
} from '../value-objects/ReimbursementState.js';

const ID = ReimbursementId.create('00000000-0000-4000-8000-000000000a01');
const EXPENSE = ExpenseRef.create('00000000-0000-4000-8000-000000000b01');
const T0 = new Date('2026-05-17T10:00:00.000Z');
const T1 = new Date('2026-05-17T11:00:00.000Z');
const T2 = new Date('2026-05-17T12:00:00.000Z');
const PAID_AT = new Date('2026-05-20T00:00:00.000Z');

function fresh(initial: ReimbursementState = unpaidReimbursable()) {
  return Reimbursement.create({
    id: ID,
    expenseId: EXPENSE,
    initialState: initial,
    now: T0,
  });
}

describe('Reimbursement.create / rehydrate', () => {
  it('initializes id, expenseId, state, timestamps', () => {
    const r = fresh();
    expect(r.id).toBe(ID);
    expect(r.expenseId).toBe(EXPENSE);
    expect(r.state).toEqual({ kind: 'UnpaidReimbursable' });
    expect(r.createdAt).toEqual(T0);
    expect(r.updatedAt).toEqual(T0);
  });

  it('rejects NaN now on create', () => {
    expect(() =>
      Reimbursement.create({
        id: ID,
        expenseId: EXPENSE,
        initialState: unpaidReimbursable(),
        now: new Date(Number.NaN),
      }),
    ).toThrow(RangeError);
  });

  it('rehydrates with explicit timestamps', () => {
    const r = Reimbursement.rehydrate({
      id: ID,
      expenseId: EXPENSE,
      state: paidReimbursable(PAID_AT),
      createdAt: T0,
      updatedAt: T1,
    });
    expect(r.state).toEqual({ kind: 'PaidReimbursable', paidAt: PAID_AT });
    expect(r.createdAt).toEqual(T0);
    expect(r.updatedAt).toEqual(T1);
  });
});

describe('Reimbursement — legal transitions', () => {
  it('markAsPaid bumps state and updatedAt', () => {
    const r = fresh();
    const out = r.markAsPaid(PAID_AT, T1);
    expect(out.ok).toBe(true);
    expect(r.state).toEqual({ kind: 'PaidReimbursable', paidAt: PAID_AT });
    expect(r.updatedAt).toEqual(T1);
  });

  it('markAsEarly captures receivedAt and bumps updatedAt', () => {
    const r = fresh();
    const out = r.markAsEarly(PAID_AT, T1);
    expect(out.ok).toBe(true);
    expect(r.state).toEqual({ kind: 'EarlyReimbursement', receivedAt: PAID_AT });
    expect(r.updatedAt).toEqual(T1);
  });

  it('markAsPending bumps state and updatedAt', () => {
    const r = fresh();
    const out = r.markAsPending(T1);
    expect(out.ok).toBe(true);
    expect(r.state).toEqual({ kind: 'PendingReimbursement' });
    expect(r.updatedAt).toEqual(T1);
  });

  it('markAsUnpaid bumps state and updatedAt', () => {
    const r = fresh(pendingReimbursement());
    const out = r.markAsUnpaid(T1);
    expect(out.ok).toBe(true);
    expect(r.state).toEqual({ kind: 'UnpaidReimbursable' });
    expect(r.updatedAt).toEqual(T1);
  });

  it('markAsNonReimbursable from Unpaid is the lone mistake-fix path', () => {
    const r = fresh();
    const out = r.markAsNonReimbursable(T1);
    expect(out.ok).toBe(true);
    expect(r.state).toEqual({ kind: 'NonReimbursable' });
    expect(r.updatedAt).toEqual(T1);
  });

  it('chains transitions and tracks updatedAt forward', () => {
    const r = fresh();
    r.markAsPending(T1);
    r.markAsPaid(PAID_AT, T2);
    expect(r.state).toEqual({ kind: 'PaidReimbursable', paidAt: PAID_AT });
    expect(r.updatedAt).toEqual(T2);
  });
});

describe('Reimbursement — illegal transitions', () => {
  it('returns err and leaves state + updatedAt untouched', () => {
    const r = fresh(nonReimbursable());
    const before = r.updatedAt;
    const out = r.markAsPaid(PAID_AT, T1);
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.error.code).toBe('illegal_transition');
    expect(r.state).toEqual({ kind: 'NonReimbursable' });
    expect(r.updatedAt).toEqual(before);
  });

  it('returns err from PaidReimbursable to anything', () => {
    const r = fresh(paidReimbursable(PAID_AT));
    expect(r.markAsPaid(PAID_AT, T1).ok).toBe(false);
    expect(r.markAsEarly(PAID_AT, T1).ok).toBe(false);
    expect(r.markAsPending(T1).ok).toBe(false);
    expect(r.markAsUnpaid(T1).ok).toBe(false);
    expect(r.markAsNonReimbursable(T1).ok).toBe(false);
    expect(r.state).toEqual({ kind: 'PaidReimbursable', paidAt: PAID_AT });
  });

  it('returns invalid_reimbursement_date and leaves state untouched on bad date', () => {
    const r = fresh();
    const out = r.markAsPaid(new Date(Number.NaN), T1);
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.error.code).toBe('invalid_reimbursement_date');
    expect(r.state).toEqual({ kind: 'UnpaidReimbursable' });
  });

  it('rejects NaN now even on a legal transition (programmer error)', () => {
    const r = fresh(unpaidReimbursable());
    expect(() => r.markAsPending(new Date(Number.NaN))).toThrow(RangeError);
    // State must have been preserved (assertion happens after transition computed,
    // before mutation).
    expect(r.state).toEqual({ kind: 'UnpaidReimbursable' });
  });

  it('rejects nonsense transitions from Early', () => {
    const r = fresh(earlyReimbursement(PAID_AT));
    expect(r.markAsEarly(PAID_AT, T1).ok).toBe(false);
    expect(r.markAsNonReimbursable(T1).ok).toBe(false);
    expect(r.state).toEqual({ kind: 'EarlyReimbursement', receivedAt: PAID_AT });
  });
});
