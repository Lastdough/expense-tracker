import { type DomainEvent } from '../../../../shared-kernel/domain-events/DomainEvent.js';
import { type Currency } from '../../../../shared-kernel/money/Currency.js';

/**
 * Only the fields that actually changed appear in `changes`. `amount` carries
 * both the new minor-unit value and the user's raw input (formula string or
 * null) when the amount changed. Currency is included alongside the amount so
 * subscribers can interpret `amountMinor` without consulting another source.
 */
export interface ExpenseEditedChanges {
  readonly transactionDate?: string; // ISO
  readonly amount?: {
    readonly amountMinor: string;
    readonly currency: Currency;
    readonly rawInput: string | null;
  };
  readonly description?: string;
  readonly categoryId?: string;
  readonly methodId?: string;
  readonly reimbursementStatusId?: string;
}

export interface ExpenseEditedPayload {
  readonly expenseId: string;
  readonly changes: ExpenseEditedChanges;
}

export class ExpenseEdited implements DomainEvent<ExpenseEditedPayload> {
  static readonly type = 'expenses.expense.edited';
  readonly type = ExpenseEdited.type;

  constructor(
    public readonly payload: ExpenseEditedPayload,
    public readonly occurredAt: Date,
  ) {}
}
