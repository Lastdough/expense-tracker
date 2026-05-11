import { err, ok, type Result } from '../../../../shared-kernel/result/Result.js';
import { type ReimbursementStatus } from '../../domain/entities/ReimbursementStatus.js';
import { ReimbursementStatusId } from '../../domain/value-objects/ReimbursementStatusId.js';
import {
  ReimbursementStatusNotFoundError,
  ReimbursementStatusReorderMismatchError,
} from '../../domain/errors/ReimbursementStatusErrors.js';
import { type IReimbursementStatusRepository } from '../../domain/repositories/IReimbursementStatusRepository.js';

export interface ReorderReimbursementStatusesInput {
  readonly ids: readonly string[];
}

export class ReorderReimbursementStatuses {
  constructor(private readonly statuses: IReimbursementStatusRepository) {}

  async execute(
    input: ReorderReimbursementStatusesInput,
  ): Promise<
    Result<
      ReimbursementStatus[],
      ReimbursementStatusNotFoundError | ReimbursementStatusReorderMismatchError
    >
  > {
    if (new Set(input.ids).size !== input.ids.length) {
      return err(
        new ReimbursementStatusReorderMismatchError('Reorder list contains duplicate ids'),
      );
    }

    for (const raw of input.ids) {
      if (!ReimbursementStatusId.isValid(raw)) {
        return err(
          new ReimbursementStatusReorderMismatchError(
            `"${raw}" is not a valid reimbursement status id`,
          ),
        );
      }
    }
    const brandedIds = input.ids.map((raw) => ReimbursementStatusId.create(raw));

    const active = await this.statuses.listActive();
    const activeIds = new Set(active.map((s) => s.id as string));

    if (brandedIds.length !== activeIds.size) {
      return err(
        new ReimbursementStatusReorderMismatchError(
          `Reorder list must contain exactly the ${activeIds.size} active reimbursement statuses; got ${brandedIds.length}`,
        ),
      );
    }

    for (const id of brandedIds) {
      if (!activeIds.has(id)) {
        return err(
          new ReimbursementStatusNotFoundError(
            `ReimbursementStatus ${id} is not active or does not exist`,
          ),
        );
      }
    }

    const byId = new Map(active.map((s) => [s.id as string, s] as const));
    const reordered: ReimbursementStatus[] = [];
    brandedIds.forEach((id, index) => {
      const status = byId.get(id);
      if (!status) return;
      status.reorderTo(index);
      reordered.push(status);
    });

    await this.statuses.saveMany(reordered);
    return ok(reordered);
  }
}
