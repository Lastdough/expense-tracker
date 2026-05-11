import { type ReimbursementStatus } from '../../domain/entities/ReimbursementStatus.js';
import { type IReimbursementStatusRepository } from '../../domain/repositories/IReimbursementStatusRepository.js';

export interface ListReimbursementStatusesInput {
  readonly includeArchived: boolean;
}

export class ListReimbursementStatuses {
  constructor(private readonly statuses: IReimbursementStatusRepository) {}

  async execute(input: ListReimbursementStatusesInput): Promise<ReimbursementStatus[]> {
    return input.includeArchived ? this.statuses.listAll() : this.statuses.listActive();
  }
}
