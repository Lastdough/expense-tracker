import { err, ok, type Result } from '../../../../shared-kernel/result/Result.js';
import { type ReimbursementStatus } from '../../domain/entities/ReimbursementStatus.js';
import { ReimbursementStatusId } from '../../domain/value-objects/ReimbursementStatusId.js';
import { ReimbursementStatusNotFoundError } from '../../domain/errors/ReimbursementStatusErrors.js';
import { type IReimbursementStatusRepository } from '../../domain/repositories/IReimbursementStatusRepository.js';

export interface UnarchiveReimbursementStatusInput {
  readonly id: string;
}

export class UnarchiveReimbursementStatus {
  constructor(private readonly statuses: IReimbursementStatusRepository) {}

  async execute(
    input: UnarchiveReimbursementStatusInput,
  ): Promise<Result<ReimbursementStatus, ReimbursementStatusNotFoundError>> {
    if (!ReimbursementStatusId.isValid(input.id)) {
      return err(new ReimbursementStatusNotFoundError(`ReimbursementStatus ${input.id} not found`));
    }
    const status = await this.statuses.findById(ReimbursementStatusId.create(input.id));
    if (!status) {
      return err(new ReimbursementStatusNotFoundError(`ReimbursementStatus ${input.id} not found`));
    }
    status.unarchive();
    await this.statuses.save(status);
    return ok(status);
  }
}
