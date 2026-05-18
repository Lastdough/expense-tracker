import { type Currency } from '../../../../shared-kernel/money/Currency.js';
import { formatMoney } from '../../../../shared-kernel/money/format.js';
import { type Expense } from '../../domain/entities/Expense.js';
import { type ListExpensesOutput } from '../use-cases/ListExpenses.js';

/**
 * Wire-safe view of an Expense. Keeps `bigint` out of JSON (encoded as a
 * decimal string) and adds the pre-formatted display value so consumers don't
 * have to recompute currency formatting. Lives in `application/dto` so the
 * `interfaces/http` layer never imports the domain entity directly.
 */
export interface ExpenseView {
  readonly id: string;
  readonly transactionDate: string;
  readonly amountMinor: string;
  readonly amountFormatted: string;
  readonly currency: Currency;
  readonly rawInput: string | null;
  readonly description: string;
  readonly categoryId: string;
  readonly methodId: string;
  readonly reimbursementStatusId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ExpenseListView {
  readonly items: readonly ExpenseView[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
}

export function serializeExpense(e: Expense): ExpenseView {
  return {
    id: e.id,
    transactionDate: e.transactionDate.toISOString(),
    amountMinor: e.amount.amount.toString(),
    amountFormatted: formatMoney(e.amount),
    currency: e.amount.currency,
    rawInput: e.rawInput,
    description: e.description,
    categoryId: e.categoryId,
    methodId: e.methodId,
    reimbursementStatusId: e.reimbursementStatusId,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}

export function serializeExpenseList(output: ListExpensesOutput): ExpenseListView {
  return {
    items: output.items.map(serializeExpense),
    total: output.total,
    limit: output.limit,
    offset: output.offset,
  };
}
