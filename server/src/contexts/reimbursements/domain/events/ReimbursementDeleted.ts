import { type DomainEvent } from '../../../../shared-kernel/domain-events/DomainEvent.js';

export interface ReimbursementDeletedPayload {
  readonly reimbursementId: string;
  readonly expenseId: string;
}

export class ReimbursementDeleted implements DomainEvent<ReimbursementDeletedPayload> {
  static readonly type = 'reimbursements.reimbursement.deleted';
  readonly type = ReimbursementDeleted.type;

  constructor(
    public readonly payload: ReimbursementDeletedPayload,
    public readonly occurredAt: Date,
  ) {}
}
