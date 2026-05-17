import { isCurrency } from '../../../../shared-kernel/money/Currency.js';
import { Money } from '../../../../shared-kernel/money/Money.js';
import { MonthlyBudget } from '../../domain/entities/MonthlyBudget.js';

export interface MonthlyBudgetRow {
  readonly amountMinor: bigint;
  readonly currency: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export const MonthlyBudgetMapper = {
  toDomain(row: MonthlyBudgetRow): MonthlyBudget {
    if (!isCurrency(row.currency)) {
      throw new RangeError(
        `MonthlyBudgetMapper.toDomain: row has unsupported currency "${row.currency}"`,
      );
    }
    return MonthlyBudget.rehydrate({
      amount: Money.fromMinor(row.amountMinor, row.currency),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  },
  toPersistence(budget: MonthlyBudget): MonthlyBudgetRow {
    return {
      amountMinor: budget.amount.amount,
      currency: budget.amount.currency,
      createdAt: budget.createdAt,
      updatedAt: budget.updatedAt,
    };
  },
};
