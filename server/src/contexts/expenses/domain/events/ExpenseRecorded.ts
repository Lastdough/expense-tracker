import { type DomainEvent } from '../../../../shared-kernel/domain-events/DomainEvent.js';
import { type Currency } from '../../../../shared-kernel/money/Currency.js';

export interface ExpenseRecordedPayload {
  readonly expenseId: string;
  readonly transactionDate: string; // ISO 8601
  /** Minor units encoded as decimal string for JSON safety (bigint is not serializable). */
  readonly amountMinor: string;
  readonly currency: Currency;
  readonly description: string;
  readonly categoryId: string;
  readonly methodId: string;
  readonly reimbursementStatusId: string;
}

export class ExpenseRecorded implements DomainEvent<ExpenseRecordedPayload> {
  static readonly type = 'expenses.expense.recorded';
  readonly type = ExpenseRecorded.type;

  constructor(
    public readonly payload: ExpenseRecordedPayload,
    public readonly occurredAt: Date,
  ) {}
}
