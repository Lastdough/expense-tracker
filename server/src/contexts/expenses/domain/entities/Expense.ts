import { Money } from '../../../../shared-kernel/money/Money.js';
import { type CategoryRef } from '../value-objects/CategoryRef.js';
import { type ExpenseId } from '../value-objects/ExpenseId.js';
import { type MethodRef } from '../value-objects/MethodRef.js';
import { type ReimbursementStatusRef } from '../value-objects/ReimbursementStatusRef.js';

const DESCRIPTION_MAX = 280;

/**
 * Expense aggregate root.
 *
 * Invariants enforced here:
 *  - `amount` is positive `Money`. Zero / negative throws `RangeError` — the
 *    use case is responsible for catching a non-positive formula result and
 *    returning an `InvalidExpenseAmountError` through `Result`. Reaching this
 *    constructor with a non-positive amount is a programmer error.
 *  - `description` is trimmed, non-empty, ≤ 280 chars.
 *  - `rawInput` is either null (user typed a plain number) or the verbatim
 *    string the user typed (preserved for display / re-edit).
 *
 * Sign of cash flow is a reporting concern (depends on reimbursement state),
 * never a property of the Expense itself — see CLAUDE.md.
 */
export class Expense {
  private constructor(
    public readonly id: ExpenseId,
    private _transactionDate: Date,
    private _amount: Money,
    private _rawInput: string | null,
    private _description: string,
    private _categoryId: CategoryRef,
    private _methodId: MethodRef,
    private _reimbursementStatusId: ReimbursementStatusRef,
    public readonly createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static create(args: {
    id: ExpenseId;
    transactionDate: Date;
    amount: Money;
    rawInput: string | null;
    description: string;
    categoryId: CategoryRef;
    methodId: MethodRef;
    reimbursementStatusId: ReimbursementStatusRef;
    now: Date;
  }): Expense {
    Expense.assertAmountPositive(args.amount);
    Expense.assertDate(args.transactionDate, 'transactionDate');
    Expense.assertDate(args.now, 'now');
    const description = Expense.assertDescription(args.description);
    return new Expense(
      args.id,
      args.transactionDate,
      args.amount,
      Expense.normalizeRawInput(args.rawInput),
      description,
      args.categoryId,
      args.methodId,
      args.reimbursementStatusId,
      args.now,
      args.now,
    );
  }

  /**
   * Rehydration constructor for the persistence layer. Skips the
   * trim/normalize on description because stored values are already canonical;
   * still enforces the structural invariants so a corrupted row surfaces
   * loudly instead of leaking into the domain.
   */
  static rehydrate(args: {
    id: ExpenseId;
    transactionDate: Date;
    amount: Money;
    rawInput: string | null;
    description: string;
    categoryId: CategoryRef;
    methodId: MethodRef;
    reimbursementStatusId: ReimbursementStatusRef;
    createdAt: Date;
    updatedAt: Date;
  }): Expense {
    Expense.assertAmountPositive(args.amount);
    Expense.assertDate(args.transactionDate, 'transactionDate');
    Expense.assertDate(args.createdAt, 'createdAt');
    Expense.assertDate(args.updatedAt, 'updatedAt');
    Expense.assertDescription(args.description);
    return new Expense(
      args.id,
      args.transactionDate,
      args.amount,
      args.rawInput,
      args.description,
      args.categoryId,
      args.methodId,
      args.reimbursementStatusId,
      args.createdAt,
      args.updatedAt,
    );
  }

  setTransactionDate(date: Date, now: Date): void {
    Expense.assertDate(date, 'transactionDate');
    Expense.assertDate(now, 'now');
    this._transactionDate = date;
    this._updatedAt = now;
  }

  setAmount(amount: Money, rawInput: string | null, now: Date): void {
    Expense.assertAmountPositive(amount);
    Expense.assertDate(now, 'now');
    this._amount = amount;
    this._rawInput = Expense.normalizeRawInput(rawInput);
    this._updatedAt = now;
  }

  setDescription(text: string, now: Date): void {
    Expense.assertDate(now, 'now');
    this._description = Expense.assertDescription(text);
    this._updatedAt = now;
  }

  setCategory(id: CategoryRef, now: Date): void {
    Expense.assertDate(now, 'now');
    this._categoryId = id;
    this._updatedAt = now;
  }

  setMethod(id: MethodRef, now: Date): void {
    Expense.assertDate(now, 'now');
    this._methodId = id;
    this._updatedAt = now;
  }

  setReimbursementStatus(id: ReimbursementStatusRef, now: Date): void {
    Expense.assertDate(now, 'now');
    this._reimbursementStatusId = id;
    this._updatedAt = now;
  }

  get transactionDate(): Date {
    return this._transactionDate;
  }
  get amount(): Money {
    return this._amount;
  }
  get rawInput(): string | null {
    return this._rawInput;
  }
  get description(): string {
    return this._description;
  }
  get categoryId(): CategoryRef {
    return this._categoryId;
  }
  get methodId(): MethodRef {
    return this._methodId;
  }
  get reimbursementStatusId(): ReimbursementStatusRef {
    return this._reimbursementStatusId;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }

  private static assertAmountPositive(amount: Money): void {
    if (!amount.isPositive()) {
      throw new RangeError(
        `Expense.amount must be positive Money; got ${amount.toString()}`,
      );
    }
  }

  private static assertDescription(text: string): string {
    if (typeof text !== 'string') {
      throw new RangeError('Expense.description must be a string');
    }
    const trimmed = text.trim();
    if (trimmed.length === 0) {
      throw new RangeError('Expense.description must not be empty');
    }
    if (trimmed.length > DESCRIPTION_MAX) {
      throw new RangeError(
        `Expense.description must be ≤ ${DESCRIPTION_MAX} chars; got ${trimmed.length}`,
      );
    }
    return trimmed;
  }

  private static assertDate(value: Date, field: string): void {
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
      throw new RangeError(`Expense.${field} must be a valid Date`);
    }
  }

  private static normalizeRawInput(raw: string | null): string | null {
    if (raw === null) return null;
    const trimmed = raw.trim();
    return trimmed.length === 0 ? null : trimmed;
  }
}

export const EXPENSE_DESCRIPTION_MAX = DESCRIPTION_MAX;
