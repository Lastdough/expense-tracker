import { type DomainEvent } from '../../../../shared-kernel/domain-events/DomainEvent.js';

export interface ReimbursementMarkedAsEarlyPayload {
  readonly reimbursementId: string;
  readonly expenseId: string;
  readonly receivedAt: string; // ISO 8601
}

export class ReimbursementMarkedAsEarly implements DomainEvent<ReimbursementMarkedAsEarlyPayload> {
  static readonly type = 'reimbursements.reimbursement.marked_as_early';
  readonly type = ReimbursementMarkedAsEarly.type;

  constructor(
    public readonly payload: ReimbursementMarkedAsEarlyPayload,
    public readonly occurredAt: Date,
  ) {}
}
