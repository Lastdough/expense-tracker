import { type Reimbursement } from '../../domain/entities/Reimbursement.js';
import { type ReimbursementStateKind } from '../../domain/errors/ReimbursementErrors.js';

export interface ReimbursementView {
  readonly id: string;
  readonly expenseId: string;
  readonly kind: ReimbursementStateKind;
  readonly paidAt: string | null;
  readonly receivedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export function serializeReimbursement(r: Reimbursement): ReimbursementView {
  const state = r.state;
  return {
    id: r.id,
    expenseId: r.expenseId,
    kind: state.kind,
    paidAt: state.kind === 'PaidReimbursable' ? state.paidAt.toISOString() : null,
    receivedAt: state.kind === 'EarlyReimbursement' ? state.receivedAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export function serializeReimbursementList(items: readonly Reimbursement[]): {
  readonly items: readonly ReimbursementView[];
} {
  return { items: items.map(serializeReimbursement) };
}
