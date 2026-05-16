import { ReimbursementStatus } from '../../domain/entities/ReimbursementStatus.js';
import { ReimbursementStatusId } from '../../domain/value-objects/ReimbursementStatusId.js';
import {
  isReimbursementStatusKind,
  type ReimbursementStatusKind,
} from '../../domain/value-objects/ReimbursementStatusKind.js';

export interface ReimbursementStatusRow {
  readonly id: string;
  readonly name: string;
  readonly nameNormalized: string;
  readonly bgColor: string;
  readonly textColor: string;
  readonly isArchived: boolean;
  readonly displayOrder: number;
  readonly kind: string;
}

export const ReimbursementStatusMapper = {
  toDomain(row: ReimbursementStatusRow): ReimbursementStatus {
    if (!isReimbursementStatusKind(row.kind)) {
      throw new RangeError(
        `ReimbursementStatusMapper.toDomain: row ${row.id} has unknown kind "${row.kind}"`,
      );
    }
    return ReimbursementStatus.create({
      id: ReimbursementStatusId.create(row.id),
      name: row.name,
      bgColor: row.bgColor,
      textColor: row.textColor,
      displayOrder: row.displayOrder,
      isArchived: row.isArchived,
      kind: row.kind,
    });
  },
  toPersistence(status: ReimbursementStatus): ReimbursementStatusRow {
    return {
      id: status.id,
      name: status.name,
      nameNormalized: status.nameNormalized,
      bgColor: status.bgColor,
      textColor: status.textColor,
      isArchived: status.isArchived,
      displayOrder: status.displayOrder,
      kind: status.kind satisfies ReimbursementStatusKind,
    };
  },
};
