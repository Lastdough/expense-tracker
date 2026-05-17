import { type DomainEvent } from '../../../../shared-kernel/domain-events/DomainEvent.js';

export interface ReimbursementMarkedAsUnpaidPayload {
  readonly reimbursementId: string;
  readonly expenseId: string;
}

export class ReimbursementMarkedAsUnpaid
  implements DomainEvent<ReimbursementMarkedAsUnpaidPayload>
{
  static readonly type = 'reimbursements.reimbursement.marked_as_unpaid';
  readonly type = ReimbursementMarkedAsUnpaid.type;

  constructor(
    public readonly payload: ReimbursementMarkedAsUnpaidPayload,
    public readonly occurredAt: Date,
  ) {}
}
