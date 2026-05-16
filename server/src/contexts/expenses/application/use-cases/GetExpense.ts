import { err, ok, type Result } from '../../../../shared-kernel/result/Result.js';
import { type Expense } from '../../domain/entities/Expense.js';
import {
  ExpenseNotFoundError,
  InvalidExpenseIdError,
} from '../../domain/errors/ExpenseErrors.js';
import { type IExpenseRepository } from '../../domain/repositories/IExpenseRepository.js';
import { ExpenseId } from '../../domain/value-objects/ExpenseId.js';

export interface GetExpenseInput {
  readonly id: string;
}

export type GetExpenseError = ExpenseNotFoundError | InvalidExpenseIdError;

export class GetExpense {
  constructor(private readonly expenses: IExpenseRepository) {}

  async execute(input: GetExpenseInput): Promise<Result<Expense, GetExpenseError>> {
    if (!ExpenseId.isValid(input.id)) {
      return err(new InvalidExpenseIdError(`Invalid expense id "${input.id}"`));
    }
    const expense = await this.expenses.findById(ExpenseId.create(input.id));
    if (!expense) {
      return err(new ExpenseNotFoundError(`Expense ${input.id} not found`));
    }
    return ok(expense);
  }
}
