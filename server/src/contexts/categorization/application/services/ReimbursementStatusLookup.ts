import { ReimbursementStatus } from '../../domain/entities/ReimbursementStatus.js';
import { type IReimbursementStatusRepository } from '../../domain/repositories/IReimbursementStatusRepository.js';
import { ReimbursementStatusId } from '../../domain/value-objects/ReimbursementStatusId.js';
import { type ReferenceOption } from './CategoryLookup.js';

/** See `CategoryLookup` for the rationale; same pattern for `ReimbursementStatus`. */
export class ReimbursementStatusLookup {
  constructor(private readonly statuses: IReimbursementStatusRepository) {}

  async isActiveById(rawId: string): Promise<boolean> {
    if (!ReimbursementStatusId.isValid(rawId)) return false;
    const status = await this.statuses.findById(ReimbursementStatusId.create(rawId));
    return status !== null && !status.isArchived;
  }

  async findIdByName(name: string): Promise<string | null> {
    const normalized = ReimbursementStatus.normalizeName(name);
    if (normalized.length === 0) return null;
    const status = await this.statuses.findByNormalizedName(normalized);
    if (status === null || status.isArchived) return null;
    return status.id;
  }

  async listActiveOptions(): Promise<readonly ReferenceOption[]> {
    const list = await this.statuses.listActive();
    return list.map((s) => ({ id: s.id, name: s.name }));
  }
}
