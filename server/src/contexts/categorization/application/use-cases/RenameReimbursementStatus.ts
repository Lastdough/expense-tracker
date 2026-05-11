import { err, ok, type Result } from '../../../../shared-kernel/result/Result.js';
import { ReimbursementStatus } from '../../domain/entities/ReimbursementStatus.js';
import { ReimbursementStatusId } from '../../domain/value-objects/ReimbursementStatusId.js';
import {
  DuplicateReimbursementStatusNameError,
  ReimbursementStatusNotFoundError,
} from '../../domain/errors/ReimbursementStatusErrors.js';
import { type IReimbursementStatusRepository } from '../../domain/repositories/IReimbursementStatusRepository.js';

export interface RenameReimbursementStatusInput {
  readonly id: string;
  readonly newName: string;
}

export class RenameReimbursementStatus {
  constructor(private readonly statuses: IReimbursementStatusRepository) {}

  async execute(
    input: RenameReimbursementStatusInput,
  ): Promise<
    Result<
      ReimbursementStatus,
      ReimbursementStatusNotFoundError | DuplicateReimbursementStatusNameError
    >
  > {
    if (!ReimbursementStatusId.isValid(input.id)) {
      return err(new ReimbursementStatusNotFoundError(`ReimbursementStatus ${input.id} not found`));
    }
    const status = await this.statuses.findById(ReimbursementStatusId.create(input.id));
    if (!status) {
      return err(new ReimbursementStatusNotFoundError(`ReimbursementStatus ${input.id} not found`));
    }

    const newNormalized = ReimbursementStatus.normalizeName(input.newName);
    if (newNormalized !== status.nameNormalized) {
      const clash = await this.statuses.findByNormalizedName(newNormalized);
      if (clash) {
        return err(
          new DuplicateReimbursementStatusNameError(
            `ReimbursementStatus "${input.newName}" already exists`,
          ),
        );
      }
    }

    status.rename(input.newName);
    await this.statuses.save(status);
    return ok(status);
  }
}
