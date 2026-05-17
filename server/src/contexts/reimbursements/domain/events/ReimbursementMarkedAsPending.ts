import { type DomainEvent } from '../../../../shared-kernel/domain-events/DomainEvent.js';

export interface ReimbursementMarkedAsPendingPayload {
  readonly reimbursementId: string;
  readonly expenseId: string;
}

export class ReimbursementMarkedAsPending
  implements DomainEvent<ReimbursementMarkedAsPendingPayload>
{
  static readonly type = 'reimbursements.reimbursement.marked_as_pending';
  readonly type = ReimbursementMarkedAsPending.type;

  constructor(
    public readonly payload: ReimbursementMarkedAsPendingPayload,
    public readonly occurredAt: Date,
  ) {}
}
