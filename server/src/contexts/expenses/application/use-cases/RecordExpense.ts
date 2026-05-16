import { randomUUID } from 'node:crypto';

import { type EventBus } from '../../../../shared-kernel/domain-events/EventBus.js';
import { type Currency } from '../../../../shared-kernel/money/Currency.js';
import { err, ok, type Result } from '../../../../shared-kernel/result/Result.js';
import { Expense } from '../../domain/entities/Expense.js';
import {
  InvalidExpenseAmountError,
  InvalidExpenseDateError,
  InvalidExpenseDescriptionError,
  type ReferenceNotFoundError,
} from '../../domain/errors/ExpenseErrors.js';
import { ExpenseRecorded } from '../../domain/events/ExpenseRecorded.js';
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

export interface RecordExpenseInput {
  readonly transactionDate: Date;
  /** Formula (e.g. "=20000*5") or plain number ("100"). Always run through the evaluator. */
  readonly amountInput: string;
  readonly description: string;
  readonly categoryId: string;
  readonly methodId: string;
  readonly reimbursementStatusId: string;
}

export type RecordExpenseError =
  | InvalidExpenseAmountError
  | InvalidExpenseDateError
  | InvalidExpenseDescriptionError
  | ReferenceNotFoundError;

export class RecordExpense {
  constructor(
    private readonly expenses: IExpenseRepository,
    private readonly references: ReferenceValidator,
    private readonly eventBus: EventBus,
    private readonly clock: () => Date = () => new Date(),
    private readonly newId: () => string = randomUUID,
  ) {}

  async execute(input: RecordExpenseInput): Promise<Result<Expense, RecordExpenseError>> {
    const dateResult = validateTransactionDate(input.transactionDate);
    if (!dateResult.ok) return dateResult;

    const descResult = validateDescription(input.description);
    if (!descResult.ok) return descResult;

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

    const refs = await this.references.assertActive({
      categoryId: input.categoryId,
      methodId: input.methodId,
      reimbursementStatusId: input.reimbursementStatusId,
    });
    if (!refs.ok) return refs;

    const rawInput = isFormulaInput(input.amountInput) ? input.amountInput.trim() : null;
    const now = this.clock();
    const expense = Expense.create({
      id: ExpenseId.create(this.newId()),
      transactionDate: input.transactionDate,
      amount: formula.value,
      rawInput,
      description: descResult.value,
      categoryId: refs.value.categoryId,
      methodId: refs.value.methodId,
      reimbursementStatusId: refs.value.reimbursementStatusId,
      now,
    });
    await this.expenses.save(expense);

    this.eventBus.publish(
      new ExpenseRecorded(
        {
          expenseId: expense.id,
          transactionDate: expense.transactionDate.toISOString(),
          amountMinor: expense.amount.amount.toString(),
          currency: expense.amount.currency,
          description: expense.description,
          categoryId: expense.categoryId,
          methodId: expense.methodId,
          reimbursementStatusId: expense.reimbursementStatusId,
        },
        now,
      ),
    );

    return ok(expense);
  }
}
