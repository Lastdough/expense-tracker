import { type EventBus } from '../../../../shared-kernel/domain-events/EventBus.js';
import { type Currency } from '../../../../shared-kernel/money/Currency.js';
import { err, ok, type Result } from '../../../../shared-kernel/result/Result.js';
import { Expense } from '../../domain/entities/Expense.js';
import {
  ExpenseNotFoundError,
  InvalidExpenseAmountError,
  InvalidExpenseDateError,
  InvalidExpenseDescriptionError,
  InvalidExpenseIdError,
  type ReferenceNotFoundError,
} from '../../domain/errors/ExpenseErrors.js';
import {
  ExpenseEdited,
  type ExpenseEditedChanges,
} from '../../domain/events/ExpenseEdited.js';
import { type IExpenseRepository } from '../../domain/repositories/IExpenseRepository.js';
import { ExpenseId } from '../../domain/value-objects/ExpenseId.js';
import { evaluateFormula } from '../../domain/services/FormulaEvaluator.js';
import { type ReferenceValidator } from '../services/ReferenceValidator.js';
import {
  isFormulaInput,
  validateDescription,
  validateTransactionDate,
} from './expenseValidation.js';

const DEFAULT_CURRENCY: Currency = 'IDR';

export interface EditExpenseInput {
  readonly id: string;
  readonly transactionDate?: Date;
  readonly amountInput?: string;
  readonly description?: string;
  readonly categoryId?: string;
  readonly methodId?: string;
  readonly reimbursementStatusId?: string;
}

export type EditExpenseError =
  | ExpenseNotFoundError
  | InvalidExpenseIdError
  | InvalidExpenseAmountError
  | InvalidExpenseDateError
  | InvalidExpenseDescriptionError
  | ReferenceNotFoundError;

export class EditExpense {
  constructor(
    private readonly expenses: IExpenseRepository,
    private readonly references: ReferenceValidator,
    private readonly eventBus: EventBus,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(input: EditExpenseInput): Promise<Result<Expense, EditExpenseError>> {
    if (!ExpenseId.isValid(input.id)) {
      return err(new InvalidExpenseIdError(`Invalid expense id "${input.id}"`));
    }
    const id = ExpenseId.create(input.id);
    const expense = await this.expenses.findById(id);
    if (!expense) {
      return err(new ExpenseNotFoundError(`Expense ${input.id} not found`));
    }

    const now = this.clock();
    const changes: Mutable<ExpenseEditedChanges> = {};

    if (input.transactionDate !== undefined) {
      const dateResult = validateTransactionDate(input.transactionDate);
      if (!dateResult.ok) return dateResult;
      if (dateResult.value.getTime() !== expense.transactionDate.getTime()) {
        expense.setTransactionDate(dateResult.value, now);
        changes.transactionDate = dateResult.value.toISOString();
      }
    }

    if (input.amountInput !== undefined) {
      const formula = evaluateFormula(input.amountInput, DEFAULT_CURRENCY);
      if (!formula.ok) {
        return err(
          new InvalidExpenseAmountError(
            `Invalid amount: ${formula.error.message} (${formula.error.code})`,
          ),
        );
      }
      if (!formula.value.isPositive()) {
        return err(new InvalidExpenseAmountError('Expense amount must be positive.'));
      }
      const rawInput = isFormulaInput(input.amountInput) ? input.amountInput.trim() : null;
      const changed =
        !formula.value.equals(expense.amount) || rawInput !== expense.rawInput;
      if (changed) {
        expense.setAmount(formula.value, rawInput, now);
        changes.amount = {
          amountMinor: expense.amount.amount.toString(),
          currency: expense.amount.currency,
          rawInput: expense.rawInput,
        };
      }
    }

    if (input.description !== undefined) {
      const descResult = validateDescription(input.description);
      if (!descResult.ok) return descResult;
      if (descResult.value !== expense.description) {
        expense.setDescription(descResult.value, now);
        changes.description = expense.description;
      }
    }

    if (input.categoryId !== undefined && input.categoryId !== expense.categoryId) {
      const res = await this.references.assertOneActive('categoryId', input.categoryId);
      if (!res.ok) return res;
      expense.setCategory(res.value, now);
      changes.categoryId = expense.categoryId;
    }

    if (input.methodId !== undefined && input.methodId !== expense.methodId) {
      const res = await this.references.assertOneActive('methodId', input.methodId);
      if (!res.ok) return res;
      expense.setMethod(res.value, now);
      changes.methodId = expense.methodId;
    }

    if (
      input.reimbursementStatusId !== undefined &&
      input.reimbursementStatusId !== expense.reimbursementStatusId
    ) {
      const res = await this.references.assertOneActive(
        'reimbursementStatusId',
        input.reimbursementStatusId,
      );
      if (!res.ok) return res;
      expense.setReimbursementStatus(res.value, now);
      changes.reimbursementStatusId = expense.reimbursementStatusId;
    }

    if (Object.keys(changes).length === 0) {
      return ok(expense);
    }

    await this.expenses.save(expense);
    this.eventBus.publish(
      new ExpenseEdited({ expenseId: expense.id, changes }, now),
    );
    return ok(expense);
  }
}

type Mutable<T> = { -readonly [K in keyof T]: T[K] };
