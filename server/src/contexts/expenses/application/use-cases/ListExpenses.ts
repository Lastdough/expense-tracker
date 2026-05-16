import { err, ok, type Result } from '../../../../shared-kernel/result/Result.js';
import { type Expense } from '../../domain/entities/Expense.js';
import {
  InvalidPaginationError,
  ReferenceNotFoundError,
} from '../../domain/errors/ExpenseErrors.js';
import {
  type ExpenseSearchCriteria,
  type IExpenseRepository,
} from '../../domain/repositories/IExpenseRepository.js';
import { CategoryRef } from '../../domain/value-objects/CategoryRef.js';
import { MethodRef } from '../../domain/value-objects/MethodRef.js';
import { ReimbursementStatusRef } from '../../domain/value-objects/ReimbursementStatusRef.js';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export interface ListExpensesInput {
  readonly dateStart?: Date;
  readonly dateEnd?: Date;
  readonly categoryId?: string;
  readonly methodId?: string;
  readonly reimbursementStatusId?: string;
  readonly descriptionQuery?: string;
  readonly limit?: number;
  readonly offset?: number;
}

export interface ListExpensesOutput {
  readonly items: readonly Expense[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
}

export type ListExpensesError = InvalidPaginationError | ReferenceNotFoundError;

export class ListExpenses {
  constructor(private readonly expenses: IExpenseRepository) {}

  async execute(
    input: ListExpensesInput,
  ): Promise<Result<ListExpensesOutput, ListExpensesError>> {
    const limit = input.limit ?? DEFAULT_LIMIT;
    const offset = input.offset ?? 0;

    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
      return err(
        new InvalidPaginationError(
          `limit must be an integer in [1, ${MAX_LIMIT}]; got ${limit}`,
        ),
      );
    }
    if (!Number.isInteger(offset) || offset < 0) {
      return err(
        new InvalidPaginationError(`offset must be a non-negative integer; got ${offset}`),
      );
    }

    const criteria: Mutable<ExpenseSearchCriteria> = { limit, offset };

    if (input.dateStart !== undefined || input.dateEnd !== undefined) {
      criteria.dateRange = {
        ...(input.dateStart !== undefined ? { start: input.dateStart } : {}),
        ...(input.dateEnd !== undefined ? { end: input.dateEnd } : {}),
      };
    }
    if (input.categoryId !== undefined) {
      if (!CategoryRef.isValid(input.categoryId)) {
        return err(new ReferenceNotFoundError('categoryId', input.categoryId));
      }
      criteria.categoryId = CategoryRef.create(input.categoryId);
    }
    if (input.methodId !== undefined) {
      if (!MethodRef.isValid(input.methodId)) {
        return err(new ReferenceNotFoundError('methodId', input.methodId));
      }
      criteria.methodId = MethodRef.create(input.methodId);
    }
    if (input.reimbursementStatusId !== undefined) {
      if (!ReimbursementStatusRef.isValid(input.reimbursementStatusId)) {
        return err(
          new ReferenceNotFoundError('reimbursementStatusId', input.reimbursementStatusId),
        );
      }
      criteria.reimbursementStatusId = ReimbursementStatusRef.create(
        input.reimbursementStatusId,
      );
    }
    if (input.descriptionQuery !== undefined) {
      const trimmed = input.descriptionQuery.trim();
      if (trimmed.length > 0) {
        criteria.descriptionQuery = trimmed;
      }
    }

    const result = await this.expenses.search(criteria);
    return ok({ items: result.items, total: result.total, limit, offset });
  }
}

type Mutable<T> = { -readonly [K in keyof T]: T[K] };
