import { err, ok, type Result } from '../../../../shared-kernel/result/Result.js';
import { EXPENSE_DESCRIPTION_MAX } from '../../domain/entities/Expense.js';
import {
  InvalidExpenseDateError,
  InvalidExpenseDescriptionError,
} from '../../domain/errors/ExpenseErrors.js';

/**
 * Shared boundary validators used by the command use cases. These translate
 * structural problems into typed Result errors so the entity's own asserts
 * stay defensive (programmer-error guards) rather than user-facing.
 */

export function validateTransactionDate(
  value: Date,
): Result<Date, InvalidExpenseDateError> {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    return err(new InvalidExpenseDateError('transactionDate must be a valid date.'));
  }
  return ok(value);
}

export function validateDescription(
  raw: string,
): Result<string, InvalidExpenseDescriptionError> {
  if (typeof raw !== 'string') {
    return err(new InvalidExpenseDescriptionError('description must be a string.'));
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return err(new InvalidExpenseDescriptionError('description must not be empty.'));
  }
  if (trimmed.length > EXPENSE_DESCRIPTION_MAX) {
    return err(
      new InvalidExpenseDescriptionError(
        `description must be ≤ ${EXPENSE_DESCRIPTION_MAX} chars; got ${trimmed.length}.`,
      ),
    );
  }
  return ok(trimmed);
}

const FORMULA_OPERATORS = /[+\-*/()]/;

/**
 * Treats input as a "formula" (worth preserving in `rawInput`) when it leads
 * with `=` OR contains any arithmetic operator. Plain numeric strings like
 * "1000" or "100.50" return false → `rawInput` is null.
 */
export function isFormulaInput(amountInput: string): boolean {
  const trimmed = amountInput.trim();
  if (trimmed.startsWith('=')) return true;
  return FORMULA_OPERATORS.test(trimmed);
}
