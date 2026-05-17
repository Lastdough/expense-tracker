import { type DomainEvent } from '../../../../shared-kernel/domain-events/DomainEvent.js';

export interface ReimbursementMarkedAsPaidPayload {
  readonly reimbursementId: string;
  readonly expenseId: string;
  readonly paidAt: string; // ISO 8601
}

export class ReimbursementMarkedAsPaid implements DomainEvent<ReimbursementMarkedAsPaidPayload> {
  static readonly type = 'reimbursements.reimbursement.marked_as_paid';
  readonly type = ReimbursementMarkedAsPaid.type;

  constructor(
    public readonly payload: ReimbursementMarkedAsPaidPayload,
    public readonly occurredAt: Date,
  ) {}
}
