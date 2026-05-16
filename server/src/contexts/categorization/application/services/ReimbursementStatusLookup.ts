import { type IReimbursementStatusRepository } from '../../domain/repositories/IReimbursementStatusRepository.js';
import { ReimbursementStatusId } from '../../domain/value-objects/ReimbursementStatusId.js';

/** See `CategoryLookup` for the rationale; same pattern for `ReimbursementStatus`. */
export class ReimbursementStatusLookup {
  constructor(private readonly statuses: IReimbursementStatusRepository) {}

  async isActiveById(rawId: string): Promise<boolean> {
    if (!ReimbursementStatusId.isValid(rawId)) return false;
    const status = await this.statuses.findById(ReimbursementStatusId.create(rawId));
    return status !== null && !status.isArchived;
  }
}
