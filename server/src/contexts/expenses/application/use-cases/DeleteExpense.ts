import { type EventBus } from '../../../../shared-kernel/domain-events/EventBus.js';
import { err, ok, type Result } from '../../../../shared-kernel/result/Result.js';
import {
  ExpenseNotFoundError,
  InvalidExpenseIdError,
} from '../../domain/errors/ExpenseErrors.js';
import { ExpenseDeleted } from '../../domain/events/ExpenseDeleted.js';
import { type IExpenseRepository } from '../../domain/repositories/IExpenseRepository.js';
import { ExpenseId } from '../../domain/value-objects/ExpenseId.js';

export interface DeleteExpenseInput {
  readonly id: string;
}

export type DeleteExpenseError = ExpenseNotFoundError | InvalidExpenseIdError;

export class DeleteExpense {
  constructor(
    private readonly expenses: IExpenseRepository,
    private readonly eventBus: EventBus,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(input: DeleteExpenseInput): Promise<Result<void, DeleteExpenseError>> {
    if (!ExpenseId.isValid(input.id)) {
      return err(new InvalidExpenseIdError(`Invalid expense id "${input.id}"`));
    }
    const id = ExpenseId.create(input.id);
    const existing = await this.expenses.findById(id);
    if (!existing) {
      return err(new ExpenseNotFoundError(`Expense ${input.id} not found`));
    }
    await this.expenses.delete(id);
    this.eventBus.publish(new ExpenseDeleted({ expenseId: id }, this.clock()));
    return ok(undefined);
  }
}
