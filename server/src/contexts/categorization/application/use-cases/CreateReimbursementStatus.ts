import { randomUUID } from 'node:crypto';
import { err, ok, type Result } from '../../../../shared-kernel/result/Result.js';
import { ReimbursementStatus } from '../../domain/entities/ReimbursementStatus.js';
import { ReimbursementStatusId } from '../../domain/value-objects/ReimbursementStatusId.js';
import { DuplicateReimbursementStatusNameError } from '../../domain/errors/ReimbursementStatusErrors.js';
import { type IReimbursementStatusRepository } from '../../domain/repositories/IReimbursementStatusRepository.js';

export interface CreateReimbursementStatusInput {
  readonly name: string;
  readonly bgColor: string;
  readonly textColor: string;
}

export class CreateReimbursementStatus {
  constructor(private readonly statuses: IReimbursementStatusRepository) {}

  async execute(
    input: CreateReimbursementStatusInput,
  ): Promise<Result<ReimbursementStatus, DuplicateReimbursementStatusNameError>> {
    const nameNormalized = ReimbursementStatus.normalizeName(input.name);
    const existing = await this.statuses.findByNormalizedName(nameNormalized);
    if (existing) {
      return err(
        new DuplicateReimbursementStatusNameError(
          `ReimbursementStatus "${input.name}" already exists`,
        ),
      );
    }

    const displayOrder = await this.statuses.nextDisplayOrder();
    const status = ReimbursementStatus.create({
      id: ReimbursementStatusId.create(randomUUID()),
      name: input.name,
      bgColor: input.bgColor,
      textColor: input.textColor,
      displayOrder,
    });
    await this.statuses.save(status);
    return ok(status);
  }
}
