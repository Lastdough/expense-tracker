import { type Result } from '../../../../shared-kernel/result/Result.js';
import { type ReimbursementId } from '../value-objects/ReimbursementId.js';
import { type ExpenseRef } from '../value-objects/ExpenseRef.js';
import {
  type ReimbursementState,
  markAsEarly,
  markAsNonReimbursable,
  markAsPaid,
  markAsPending,
  markAsUnpaid,
} from '../value-objects/ReimbursementState.js';
import {
  IllegalTransitionError,
  InvalidReimbursementDateError,
} from '../errors/ReimbursementErrors.js';

/**
 * One Reimbursement per Expense (enforced by a unique constraint on
 * `expenseId`). The state machine lives in `ReimbursementState`; this
 * aggregate is responsible for invariant tracking (id, expenseId, timestamps)
 * and for refreshing `updatedAt` on every successful transition.
 *
 * Transitions return `Result.err` on illegal transitions or bad dates; on
 * `err` the aggregate is left untouched (no partial mutation, no clock bump).
 */
export class Reimbursement {
  private constructor(
    public readonly id: ReimbursementId,
    public readonly expenseId: ExpenseRef,
    private _state: ReimbursementState,
    public readonly createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static create(args: {
    id: ReimbursementId;
    expenseId: ExpenseRef;
    initialState: ReimbursementState;
    now: Date;
  }): Reimbursement {
    assertDate(args.now, 'now');
    return new Reimbursement(args.id, args.expenseId, args.initialState, args.now, args.now);
  }

  static rehydrate(args: {
    id: ReimbursementId;
    expenseId: ExpenseRef;
    state: ReimbursementState;
    createdAt: Date;
    updatedAt: Date;
  }): Reimbursement {
    assertDate(args.createdAt, 'createdAt');
    assertDate(args.updatedAt, 'updatedAt');
    return new Reimbursement(args.id, args.expenseId, args.state, args.createdAt, args.updatedAt);
  }

  get state(): ReimbursementState {
    return this._state;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  markAsPaid(
    paidAt: Date,
    now: Date,
  ): Result<void, IllegalTransitionError | InvalidReimbursementDateError> {
    return this.apply(markAsPaid(this._state, paidAt), now);
  }

  markAsEarly(
    receivedAt: Date,
    now: Date,
  ): Result<void, IllegalTransitionError | InvalidReimbursementDateError> {
    return this.apply(markAsEarly(this._state, receivedAt), now);
  }

  markAsPending(now: Date): Result<void, IllegalTransitionError> {
    return this.apply(markAsPending(this._state), now);
  }

  markAsUnpaid(now: Date): Result<void, IllegalTransitionError> {
    return this.apply(markAsUnpaid(this._state), now);
  }

  markAsNonReimbursable(now: Date): Result<void, IllegalTransitionError> {
    return this.apply(markAsNonReimbursable(this._state), now);
  }

  private apply<E>(
    transition: Result<ReimbursementState, E>,
    now: Date,
  ): Result<void, E> {
    if (!transition.ok) return transition;
    assertDate(now, 'now');
    this._state = transition.value;
    this._updatedAt = now;
    return { ok: true, value: undefined };
  }
}

function assertDate(value: Date, field: string): void {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new RangeError(`Reimbursement: ${field} must be a valid Date`);
  }
}
