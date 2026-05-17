import { err, ok, type Result } from '../../../../shared-kernel/result/Result.js';
import { type Reimbursement } from '../../domain/entities/Reimbursement.js';
import {
  InvalidExpenseRefError,
  ReimbursementNotFoundError,
} from '../../domain/errors/ReimbursementErrors.js';
import { type IReimbursementRepository } from '../../domain/repositories/IReimbursementRepository.js';
import { ExpenseRef } from '../../domain/value-objects/ExpenseRef.js';

export interface GetReimbursementByExpenseInput {
  readonly expenseId: string;
}

export type GetReimbursementByExpenseError =
  | InvalidExpenseRefError
  | ReimbursementNotFoundError;

export class GetReimbursementByExpense {
  constructor(private readonly reimbursements: IReimbursementRepository) {}

  async execute(
    input: GetReimbursementByExpenseInput,
  ): Promise<Result<Reimbursement, GetReimbursementByExpenseError>> {
    if (!ExpenseRef.isValid(input.expenseId)) {
      return err(new InvalidExpenseRefError(`Invalid expense id "${input.expenseId}"`));
    }
    const r = await this.reimbursements.findByExpenseId(ExpenseRef.create(input.expenseId));
    if (!r) {
      return err(
        new ReimbursementNotFoundError(
          `No reimbursement found for expense ${input.expenseId}`,
        ),
      );
    }
    return ok(r);
  }
}
