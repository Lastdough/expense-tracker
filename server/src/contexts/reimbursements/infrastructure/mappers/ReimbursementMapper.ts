import { Reimbursement } from '../../domain/entities/Reimbursement.js';
import { ReimbursementId } from '../../domain/value-objects/ReimbursementId.js';
import { ExpenseRef } from '../../domain/value-objects/ExpenseRef.js';
import {
  earlyReimbursement,
  nonReimbursable,
  paidReimbursable,
  pendingReimbursement,
  unpaidReimbursable,
  type ReimbursementState,
} from '../../domain/value-objects/ReimbursementState.js';

export interface ReimbursementRow {
  readonly id: string;
  readonly expenseId: string;
  readonly kind: string;
  readonly paidAt: Date | null;
  readonly receivedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export const ReimbursementMapper = {
  toDomain(row: ReimbursementRow): Reimbursement {
    return Reimbursement.rehydrate({
      id: ReimbursementId.create(row.id),
      expenseId: ExpenseRef.create(row.expenseId),
      state: stateFromRow(row),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  },
  toPersistence(reimbursement: Reimbursement): ReimbursementRow {
    const state = reimbursement.state;
    return {
      id: reimbursement.id,
      expenseId: reimbursement.expenseId,
      kind: state.kind,
      paidAt: state.kind === 'PaidReimbursable' ? state.paidAt : null,
      receivedAt: state.kind === 'EarlyReimbursement' ? state.receivedAt : null,
      createdAt: reimbursement.createdAt,
      updatedAt: reimbursement.updatedAt,
    };
  },
};

function stateFromRow(row: ReimbursementRow): ReimbursementState {
  switch (row.kind) {
    case 'NonReimbursable':
      return nonReimbursable();
    case 'UnpaidReimbursable':
      return unpaidReimbursable();
    case 'PendingReimbursement':
      return pendingReimbursement();
    case 'PaidReimbursable':
      if (row.paidAt === null) {
        throw new RangeError(
          `ReimbursementMapper.toDomain: row ${row.id} has kind=PaidReimbursable but paidAt is null`,
        );
      }
      return paidReimbursable(row.paidAt);
    case 'EarlyReimbursement':
      if (row.receivedAt === null) {
        throw new RangeError(
          `ReimbursementMapper.toDomain: row ${row.id} has kind=EarlyReimbursement but receivedAt is null`,
        );
      }
      return earlyReimbursement(row.receivedAt);
    default:
      throw new RangeError(
        `ReimbursementMapper.toDomain: row ${row.id} has unknown kind "${row.kind}"`,
      );
  }
}
