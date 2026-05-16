import { type DomainEvent } from '../../../../shared-kernel/domain-events/DomainEvent.js';

export interface ExpenseDeletedPayload {
  readonly expenseId: string;
}

export class ExpenseDeleted implements DomainEvent<ExpenseDeletedPayload> {
  static readonly type = 'expenses.expense.deleted';
  readonly type = ExpenseDeleted.type;

  constructor(
    public readonly payload: ExpenseDeletedPayload,
    public readonly occurredAt: Date,
  ) {}
}
