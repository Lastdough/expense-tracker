import { type DomainEvent } from '../../../../shared-kernel/domain-events/DomainEvent.js';
import { type ReimbursementStateKind } from '../errors/ReimbursementErrors.js';

export interface ReimbursementCreatedPayload {
  readonly reimbursementId: string;
  readonly expenseId: string;
  readonly initialKind: ReimbursementStateKind;
  readonly paidAt: string | null;
  readonly receivedAt: string | null;
}

export class ReimbursementCreated implements DomainEvent<ReimbursementCreatedPayload> {
  static readonly type = 'reimbursements.reimbursement.created';
  readonly type = ReimbursementCreated.type;

  constructor(
    public readonly payload: ReimbursementCreatedPayload,
    public readonly occurredAt: Date,
  ) {}
}
