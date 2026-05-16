import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { Money } from '../../../../shared-kernel/money/Money.js';
import { CategoryRef } from '../value-objects/CategoryRef.js';
import { ExpenseId } from '../value-objects/ExpenseId.js';
import { MethodRef } from '../value-objects/MethodRef.js';
import { ReimbursementStatusRef } from '../value-objects/ReimbursementStatusRef.js';
import { EXPENSE_DESCRIPTION_MAX, Expense } from './Expense.js';

function makeArgs(overrides: Partial<Parameters<typeof Expense.create>[0]> = {}) {
  return {
    id: ExpenseId.create(randomUUID()),
    transactionDate: new Date('2026-05-16T00:00:00.000Z'),
    amount: Money.fromMinor(100_000n, 'IDR'),
    rawInput: null,
    description: 'Lunch',
    categoryId: CategoryRef.create(randomUUID()),
    methodId: MethodRef.create(randomUUID()),
    reimbursementStatusId: ReimbursementStatusRef.create(randomUUID()),
    now: new Date('2026-05-16T12:00:00.000Z'),
    ...overrides,
  };
}

describe('Expense.create', () => {
  it('builds an expense with all provided fields', () => {
    const args = makeArgs({ rawInput: '=20000*5' });
    const e = Expense.create(args);

    expect(e.id).toBe(args.id);
    expect(e.transactionDate).toEqual(args.transactionDate);
    expect(e.amount.equals(args.amount)).toBe(true);
    expect(e.rawInput).toBe('=20000*5');
    expect(e.description).toBe('Lunch');
    expect(e.categoryId).toBe(args.categoryId);
    expect(e.methodId).toBe(args.methodId);
    expect(e.reimbursementStatusId).toBe(args.reimbursementStatusId);
    expect(e.createdAt).toEqual(args.now);
    expect(e.updatedAt).toEqual(args.now);
  });

  it('trims the description', () => {
    const e = Expense.create(makeArgs({ description: '  Lunch with team  ' }));
    expect(e.description).toBe('Lunch with team');
  });

  it('treats whitespace-only rawInput as null', () => {
    const e = Expense.create(makeArgs({ rawInput: '   ' }));
    expect(e.rawInput).toBeNull();
  });

  it('trims rawInput when non-empty', () => {
    const e = Expense.create(makeArgs({ rawInput: '  =100+50  ' }));
    expect(e.rawInput).toBe('=100+50');
  });

  it('rejects a zero amount', () => {
    expect(() =>
      Expense.create(makeArgs({ amount: Money.fromMinor(0n, 'IDR') })),
    ).toThrow(RangeError);
  });

  it('rejects a negative amount', () => {
    expect(() =>
      Expense.create(makeArgs({ amount: Money.fromMinor(-1n, 'IDR') })),
    ).toThrow(RangeError);
  });

  it('rejects an empty description', () => {
    expect(() => Expense.create(makeArgs({ description: '' }))).toThrow(RangeError);
  });

  it('rejects a whitespace-only description', () => {
    expect(() => Expense.create(makeArgs({ description: '   ' }))).toThrow(RangeError);
  });

  it('rejects a description longer than the max', () => {
    expect(() =>
      Expense.create(makeArgs({ description: 'x'.repeat(EXPENSE_DESCRIPTION_MAX + 1) })),
    ).toThrow(RangeError);
  });

  it('accepts a description at exactly the max', () => {
    const e = Expense.create(makeArgs({ description: 'x'.repeat(EXPENSE_DESCRIPTION_MAX) }));
    expect(e.description.length).toBe(EXPENSE_DESCRIPTION_MAX);
  });

  it('rejects an invalid transactionDate', () => {
    expect(() => Expense.create(makeArgs({ transactionDate: new Date('not-a-date') }))).toThrow(
      RangeError,
    );
  });

  it('rejects an invalid `now`', () => {
    expect(() => Expense.create(makeArgs({ now: new Date('not-a-date') }))).toThrow(RangeError);
  });
});

describe('Expense setters', () => {
  it('setTransactionDate refreshes updatedAt', () => {
    const e = Expense.create(makeArgs());
    const later = new Date('2026-05-17T00:00:00.000Z');
    e.setTransactionDate(new Date('2026-05-16T03:00:00.000Z'), later);
    expect(e.transactionDate).toEqual(new Date('2026-05-16T03:00:00.000Z'));
    expect(e.updatedAt).toEqual(later);
  });

  it('setAmount updates amount and rawInput together and refreshes updatedAt', () => {
    const e = Expense.create(makeArgs({ rawInput: '=10+90' }));
    const later = new Date('2026-05-17T00:00:00.000Z');
    e.setAmount(Money.fromMinor(50_000n, 'IDR'), null, later);
    expect(e.amount.equals(Money.fromMinor(50_000n, 'IDR'))).toBe(true);
    expect(e.rawInput).toBeNull();
    expect(e.updatedAt).toEqual(later);
  });

  it('setAmount rejects non-positive amounts', () => {
    const e = Expense.create(makeArgs());
    expect(() => e.setAmount(Money.fromMinor(0n, 'IDR'), null, new Date())).toThrow(RangeError);
  });

  it('setDescription trims, validates, refreshes updatedAt', () => {
    const e = Expense.create(makeArgs());
    const later = new Date('2026-05-17T00:00:00.000Z');
    e.setDescription('  New text  ', later);
    expect(e.description).toBe('New text');
    expect(e.updatedAt).toEqual(later);
    expect(() => e.setDescription('', new Date())).toThrow(RangeError);
  });

  it('setCategory / setMethod / setReimbursementStatus swap the id and refresh updatedAt', () => {
    const e = Expense.create(makeArgs());
    const later = new Date('2026-05-17T00:00:00.000Z');
    const newCategory = CategoryRef.create(randomUUID());
    const newMethod = MethodRef.create(randomUUID());
    const newStatus = ReimbursementStatusRef.create(randomUUID());

    e.setCategory(newCategory, later);
    expect(e.categoryId).toBe(newCategory);
    expect(e.updatedAt).toEqual(later);

    const evenLater = new Date('2026-05-18T00:00:00.000Z');
    e.setMethod(newMethod, evenLater);
    expect(e.methodId).toBe(newMethod);
    expect(e.updatedAt).toEqual(evenLater);

    const evenLaterStill = new Date('2026-05-19T00:00:00.000Z');
    e.setReimbursementStatus(newStatus, evenLaterStill);
    expect(e.reimbursementStatusId).toBe(newStatus);
    expect(e.updatedAt).toEqual(evenLaterStill);
  });
});

describe('Expense.rehydrate', () => {
  it('round-trips through create → rehydrate without drift', () => {
    const args = makeArgs({ rawInput: '=20000*5' });
    const created = Expense.create(args);
    const rehydrated = Expense.rehydrate({
      id: created.id,
      transactionDate: created.transactionDate,
      amount: created.amount,
      rawInput: created.rawInput,
      description: created.description,
      categoryId: created.categoryId,
      methodId: created.methodId,
      reimbursementStatusId: created.reimbursementStatusId,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    });
    expect(rehydrated.id).toBe(created.id);
    expect(rehydrated.amount.equals(created.amount)).toBe(true);
    expect(rehydrated.rawInput).toBe(created.rawInput);
    expect(rehydrated.description).toBe(created.description);
    expect(rehydrated.updatedAt).toEqual(created.updatedAt);
  });

  it('still enforces structural invariants on rehydration', () => {
    const args = makeArgs();
    const baseline = Expense.create(args);
    expect(() =>
      Expense.rehydrate({
        id: baseline.id,
        transactionDate: baseline.transactionDate,
        amount: Money.fromMinor(0n, 'IDR'),
        rawInput: null,
        description: baseline.description,
        categoryId: baseline.categoryId,
        methodId: baseline.methodId,
        reimbursementStatusId: baseline.reimbursementStatusId,
        createdAt: baseline.createdAt,
        updatedAt: baseline.updatedAt,
      }),
    ).toThrow(RangeError);
  });
});
