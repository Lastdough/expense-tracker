import { type PrismaClient } from '@prisma/client';
import { type ReimbursementStatus } from '../../../domain/entities/ReimbursementStatus.js';
import { type ReimbursementStatusId } from '../../../domain/value-objects/ReimbursementStatusId.js';
import { type IReimbursementStatusRepository } from '../../../domain/repositories/IReimbursementStatusRepository.js';
import { ReimbursementStatusMapper } from '../../mappers/ReimbursementStatusMapper.js';

export class PrismaReimbursementStatusRepository implements IReimbursementStatusRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(status: ReimbursementStatus): Promise<void> {
    const row = ReimbursementStatusMapper.toPersistence(status);
    await this.prisma.reimbursementStatus.upsert({
      where: { id: row.id },
      create: row,
      update: {
        name: row.name,
        nameNormalized: row.nameNormalized,
        bgColor: row.bgColor,
        textColor: row.textColor,
        isArchived: row.isArchived,
        displayOrder: row.displayOrder,
        // `kind` intentionally omitted — immutable after creation.
      },
    });
  }

  async saveMany(statuses: readonly ReimbursementStatus[]): Promise<void> {
    if (statuses.length === 0) return;
    await this.prisma.$transaction(
      statuses.map((s) => {
        const row = ReimbursementStatusMapper.toPersistence(s);
        return this.prisma.reimbursementStatus.update({
          where: { id: row.id },
          data: {
            name: row.name,
            nameNormalized: row.nameNormalized,
            bgColor: row.bgColor,
            textColor: row.textColor,
            isArchived: row.isArchived,
            displayOrder: row.displayOrder,
          },
        });
      }),
    );
  }

  async findById(id: ReimbursementStatusId): Promise<ReimbursementStatus | null> {
    const row = await this.prisma.reimbursementStatus.findUnique({ where: { id } });
    return row ? ReimbursementStatusMapper.toDomain(row) : null;
  }

  async findByNormalizedName(nameNormalized: string): Promise<ReimbursementStatus | null> {
    const row = await this.prisma.reimbursementStatus.findUnique({ where: { nameNormalized } });
    return row ? ReimbursementStatusMapper.toDomain(row) : null;
  }

  async listAll(): Promise<ReimbursementStatus[]> {
    const rows = await this.prisma.reimbursementStatus.findMany({
      orderBy: { displayOrder: 'asc' },
    });
    return rows.map(ReimbursementStatusMapper.toDomain);
  }

  async listActive(): Promise<ReimbursementStatus[]> {
    const rows = await this.prisma.reimbursementStatus.findMany({
      where: { isArchived: false },
      orderBy: { displayOrder: 'asc' },
    });
    return rows.map(ReimbursementStatusMapper.toDomain);
  }

  async nextDisplayOrder(): Promise<number> {
    const agg = await this.prisma.reimbursementStatus.aggregate({
      _max: { displayOrder: true },
    });
    return agg._max.displayOrder === null ? 0 : agg._max.displayOrder + 1;
  }
}
