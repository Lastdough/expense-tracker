import { Money } from '../../../../shared-kernel/money/Money.js';

/**
 * Singleton aggregate holding the Phase-1 monthly budget. The repository
 * keys this on a fixed 'singleton' id — the aggregate itself doesn't carry
 * an id because there is at most one in the system.
 *
 * Invariants:
 *   - amount must be non-negative (a negative budget is meaningless;
 *     "unset" is represented by no row, not by a negative amount)
 *   - currency is whatever the Money VO accepts
 */
export class MonthlyBudget {
  private constructor(
    private _amount: Money,
    public readonly createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static create(args: { amount: Money; now: Date }): MonthlyBudget {
    assertNonNegative(args.amount);
    assertDate(args.now, 'now');
    return new MonthlyBudget(args.amount, args.now, args.now);
  }

  static rehydrate(args: { amount: Money; createdAt: Date; updatedAt: Date }): MonthlyBudget {
    assertDate(args.createdAt, 'createdAt');
    assertDate(args.updatedAt, 'updatedAt');
    return new MonthlyBudget(args.amount, args.createdAt, args.updatedAt);
  }

  get amount(): Money {
    return this._amount;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  change(amount: Money, now: Date): void {
    assertNonNegative(amount);
    assertDate(now, 'now');
    this._amount = amount;
    this._updatedAt = now;
  }
}

function assertNonNegative(amount: Money): void {
  if (amount.isNegative()) {
    throw new RangeError(`MonthlyBudget: amount must be non-negative, got ${amount.toString()}`);
  }
}

function assertDate(value: Date, field: string): void {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new RangeError(`MonthlyBudget: ${field} must be a valid Date`);
  }
}
