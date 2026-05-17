import { type DomainEvent } from '../../../../shared-kernel/domain-events/DomainEvent.js';

export interface ReimbursementMarkedAsNonReimbursablePayload {
  readonly reimbursementId: string;
  readonly expenseId: string;
}

export class ReimbursementMarkedAsNonReimbursable
  implements DomainEvent<ReimbursementMarkedAsNonReimbursablePayload>
{
  static readonly type = 'reimbursements.reimbursement.marked_as_non_reimbursable';
  readonly type = ReimbursementMarkedAsNonReimbursable.type;

  constructor(
    public readonly payload: ReimbursementMarkedAsNonReimbursablePayload,
    public readonly occurredAt: Date,
  ) {}
}
