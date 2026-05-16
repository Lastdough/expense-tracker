import { type IReimbursementStatusRepository } from '../../domain/repositories/IReimbursementStatusRepository.js';
import { ReimbursementStatusId } from '../../domain/value-objects/ReimbursementStatusId.js';
import { type ReimbursementStatusKind } from '../../domain/value-objects/ReimbursementStatusKind.js';

// Cross-context bridge: maps a ReimbursementStatus UUID to its stable kind
// discriminator. The reimbursements context uses this when seeding a new
// Reimbursement on ExpenseRecorded, translating the user-picked status into
// a ReimbursementState variant without importing categorization's domain.

export class ReimbursementStatusKindLookup {
  constructor(private readonly statuses: IReimbursementStatusRepository) {}

  async kindById(rawId: string): Promise<ReimbursementStatusKind | null> {
    if (!ReimbursementStatusId.isValid(rawId)) return null;
    const status = await this.statuses.findById(ReimbursementStatusId.create(rawId));
    return status?.kind ?? null;
  }
}
