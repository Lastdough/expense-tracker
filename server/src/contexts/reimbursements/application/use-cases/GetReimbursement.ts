import { err, ok, type Result } from '../../../../shared-kernel/result/Result.js';
import { type Reimbursement } from '../../domain/entities/Reimbursement.js';
import {
  InvalidReimbursementIdError,
  ReimbursementNotFoundError,
} from '../../domain/errors/ReimbursementErrors.js';
import { type IReimbursementRepository } from '../../domain/repositories/IReimbursementRepository.js';
import { ReimbursementId } from '../../domain/value-objects/ReimbursementId.js';

export interface GetReimbursementInput {
  readonly id: string;
}

export type GetReimbursementError = InvalidReimbursementIdError | ReimbursementNotFoundError;

export class GetReimbursement {
  constructor(private readonly reimbursements: IReimbursementRepository) {}

  async execute(
    input: GetReimbursementInput,
  ): Promise<Result<Reimbursement, GetReimbursementError>> {
    if (!ReimbursementId.isValid(input.id)) {
      return err(new InvalidReimbursementIdError(`Invalid reimbursement id "${input.id}"`));
    }
    const r = await this.reimbursements.findById(ReimbursementId.create(input.id));
    if (!r) return err(new ReimbursementNotFoundError(`Reimbursement ${input.id} not found`));
    return ok(r);
  }
}
