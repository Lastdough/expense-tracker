import { type Reimbursement } from '../entities/Reimbursement.js';
import { type ReimbursementId } from '../value-objects/ReimbursementId.js';
import { type ExpenseRef } from '../value-objects/ExpenseRef.js';

export interface IReimbursementRepository {
  save(reimbursement: Reimbursement): Promise<void>;
  delete(id: ReimbursementId): Promise<void>;
  deleteByExpenseId(expenseId: ExpenseRef): Promise<void>;
  findById(id: ReimbursementId): Promise<Reimbursement | null>;
  findByExpenseId(expenseId: ExpenseRef): Promise<Reimbursement | null>;

  /**
   * Reimbursements currently in `UnpaidReimbursable`, scoped to the
   * underlying expense's transactionDate falling in `[start, end)`.
   * Powers reporting's "what am I owed?" listing.
   */
  findUnpaidReimbursables(range: { start: Date; end: Date }): Promise<Reimbursement[]>;
}
