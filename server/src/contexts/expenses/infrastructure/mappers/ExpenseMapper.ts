import { isCurrency } from '../../../../shared-kernel/money/Currency.js';
import { Money } from '../../../../shared-kernel/money/Money.js';
import { Expense } from '../../domain/entities/Expense.js';
import { CategoryRef } from '../../domain/value-objects/CategoryRef.js';
import { ExpenseId } from '../../domain/value-objects/ExpenseId.js';
import { MethodRef } from '../../domain/value-objects/MethodRef.js';
import { ReimbursementStatusRef } from '../../domain/value-objects/ReimbursementStatusRef.js';

// Local row shape — keeps this file Prisma-free. The repository imports
// @prisma/client; the mapper does not.
export interface ExpenseRow {
  readonly id: string;
  readonly transactionDate: Date;
  readonly amountMinor: bigint;
  readonly currency: string;
  readonly rawInput: string | null;
  readonly description: string;
  readonly categoryId: string;
  readonly methodId: string;
  readonly reimbursementStatusId: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export const ExpenseMapper = {
  toDomain(row: ExpenseRow): Expense {
    if (!isCurrency(row.currency)) {
      throw new RangeError(
        `ExpenseMapper.toDomain: row ${row.id} has unknown currency "${row.currency}"`,
      );
    }
    return Expense.rehydrate({
      id: ExpenseId.create(row.id),
      transactionDate: row.transactionDate,
      amount: Money.fromMinor(row.amountMinor, row.currency),
      rawInput: row.rawInput,
      description: row.description,
      categoryId: CategoryRef.create(row.categoryId),
      methodId: MethodRef.create(row.methodId),
      reimbursementStatusId: ReimbursementStatusRef.create(row.reimbursementStatusId),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  },

  toPersistence(expense: Expense): ExpenseRow {
    return {
      id: expense.id,
      transactionDate: expense.transactionDate,
      amountMinor: expense.amount.amount,
      currency: expense.amount.currency,
      rawInput: expense.rawInput,
      description: expense.description,
      categoryId: expense.categoryId,
      methodId: expense.methodId,
      reimbursementStatusId: expense.reimbursementStatusId,
      createdAt: expense.createdAt,
      updatedAt: expense.updatedAt,
    };
  },
};
