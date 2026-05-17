import { type PrismaClient } from '@prisma/client';
import { type Reimbursement } from '../../../domain/entities/Reimbursement.js';
import { type ReimbursementId } from '../../../domain/value-objects/ReimbursementId.js';
import { type ExpenseRef } from '../../../domain/value-objects/ExpenseRef.js';
import { type IReimbursementRepository } from '../../../domain/repositories/IReimbursementRepository.js';
import { ReimbursementMapper } from '../../mappers/ReimbursementMapper.js';

export class PrismaReimbursementRepository implements IReimbursementRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(reimbursement: Reimbursement): Promise<void> {
    const row = ReimbursementMapper.toPersistence(reimbursement);
    // upsert so transitions round-trip through the same path as creation.
    // updatedAt is driven by the aggregate, not Prisma's @updatedAt — we
    // pass it explicitly on both create and update.
    await this.prisma.reimbursement.upsert({
      where: { id: row.id },
      create: {
        id: row.id,
        expenseId: row.expenseId,
        kind: row.kind,
        paidAt: row.paidAt,
        receivedAt: row.receivedAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
      update: {
        kind: row.kind,
        paidAt: row.paidAt,
        receivedAt: row.receivedAt,
        updatedAt: row.updatedAt,
      },
    });
  }

  async delete(id: ReimbursementId): Promise<void> {
    await this.prisma.reimbursement.deleteMany({ where: { id } });
  }

  async deleteByExpenseId(expenseId: ExpenseRef): Promise<void> {
    await this.prisma.reimbursement.deleteMany({ where: { expenseId } });
  }

  async findById(id: ReimbursementId): Promise<Reimbursement | null> {
    const row = await this.prisma.reimbursement.findUnique({ where: { id } });
    return row ? ReimbursementMapper.toDomain(row) : null;
  }

  async findByExpenseId(expenseId: ExpenseRef): Promise<Reimbursement | null> {
    const row = await this.prisma.reimbursement.findUnique({ where: { expenseId } });
    return row ? ReimbursementMapper.toDomain(row) : null;
  }

  async findUnpaidReimbursables(range: { start: Date; end: Date }): Promise<Reimbursement[]> {
    const rows = await this.prisma.reimbursement.findMany({
      where: {
        kind: 'UnpaidReimbursable',
        expense: {
          transactionDate: { gte: range.start, lt: range.end },
        },
      },
      orderBy: [{ expense: { transactionDate: 'desc' } }, { createdAt: 'desc' }],
    });
    return rows.map(ReimbursementMapper.toDomain);
  }
}
