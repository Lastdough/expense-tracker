import { type ReimbursementStatus } from '../entities/ReimbursementStatus.js';
import { type ReimbursementStatusId } from '../value-objects/ReimbursementStatusId.js';

export interface IReimbursementStatusRepository {
  save(status: ReimbursementStatus): Promise<void>;
  saveMany(statuses: readonly ReimbursementStatus[]): Promise<void>;
  findById(id: ReimbursementStatusId): Promise<ReimbursementStatus | null>;
  findByNormalizedName(nameNormalized: string): Promise<ReimbursementStatus | null>;
  listAll(): Promise<ReimbursementStatus[]>;
  listActive(): Promise<ReimbursementStatus[]>;
  nextDisplayOrder(): Promise<number>;
}
