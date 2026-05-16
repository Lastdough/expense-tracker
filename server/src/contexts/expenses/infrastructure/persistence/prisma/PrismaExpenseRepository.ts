import { type Prisma, type PrismaClient } from '@prisma/client';

import { type Expense } from '../../../domain/entities/Expense.js';
import {
  type ExpenseSearchCriteria,
  type ExpenseSearchResult,
  type IExpenseRepository,
} from '../../../domain/repositories/IExpenseRepository.js';
import { type ExpenseId } from '../../../domain/value-objects/ExpenseId.js';
import { ExpenseMapper } from '../../mappers/ExpenseMapper.js';

export class PrismaExpenseRepository implements IExpenseRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(expense: Expense): Promise<void> {
    const row = ExpenseMapper.toPersistence(expense);
    // upsert so EditExpense round-trips through the same call path as
    // RecordExpense. updatedAt is set by the aggregate, not by the DB —
    // we override Prisma's @updatedAt to keep the aggregate authoritative.
    await this.prisma.expense.upsert({
      where: { id: row.id },
      create: {
        id: row.id,
        transactionDate: row.transactionDate,
        amountMinor: row.amountMinor,
        currency: row.currency,
        rawInput: row.rawInput,
        description: row.description,
        categoryId: row.categoryId,
        methodId: row.methodId,
        reimbursementStatusId: row.reimbursementStatusId,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
      update: {
        transactionDate: row.transactionDate,
        amountMinor: row.amountMinor,
        currency: row.currency,
        rawInput: row.rawInput,
        description: row.description,
        categoryId: row.categoryId,
        methodId: row.methodId,
        reimbursementStatusId: row.reimbursementStatusId,
        updatedAt: row.updatedAt,
      },
    });
  }

  async delete(id: ExpenseId): Promise<void> {
    await this.prisma.expense.delete({ where: { id } });
  }

  async findById(id: ExpenseId): Promise<Expense | null> {
    const row = await this.prisma.expense.findUnique({ where: { id } });
    return row ? ExpenseMapper.toDomain(row) : null;
  }

  async findInDateRange(range: { start: Date; end: Date }): Promise<Expense[]> {
    const rows = await this.prisma.expense.findMany({
      where: { transactionDate: { gte: range.start, lt: range.end } },
      orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map(ExpenseMapper.toDomain);
  }

  async search(criteria: ExpenseSearchCriteria): Promise<ExpenseSearchResult> {
    const where = buildWhere(criteria);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.expense.findMany({
        where,
        orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
        skip: criteria.offset,
        take: criteria.limit,
      }),
      this.prisma.expense.count({ where }),
    ]);
    return {
      items: rows.map(ExpenseMapper.toDomain),
      total,
    };
  }
}

function buildWhere(criteria: ExpenseSearchCriteria): Prisma.ExpenseWhereInput {
  const where: Prisma.ExpenseWhereInput = {};

  if (criteria.dateRange) {
    const range: Prisma.DateTimeFilter = {};
    if (criteria.dateRange.start !== undefined) range.gte = criteria.dateRange.start;
    if (criteria.dateRange.end !== undefined) range.lt = criteria.dateRange.end;
    if (range.gte !== undefined || range.lt !== undefined) {
      where.transactionDate = range;
    }
  }
  if (criteria.categoryId !== undefined) where.categoryId = criteria.categoryId;
  if (criteria.methodId !== undefined) where.methodId = criteria.methodId;
  if (criteria.reimbursementStatusId !== undefined) {
    where.reimbursementStatusId = criteria.reimbursementStatusId;
  }
  if (criteria.descriptionQuery !== undefined && criteria.descriptionQuery.length > 0) {
    // Prisma's typed `mode: 'insensitive'` is unavailable on the SQLite
    // generated client. SQLite's LIKE is ASCII case-insensitive by default,
    // which is what we want for dev. Postgres LIKE without ILIKE is
    // case-sensitive — revisit if Postgres becomes the primary dev target
    // (a lowercased denormalized column or pg_trgm is the upgrade path).
    where.description = { contains: criteria.descriptionQuery };
  }
  return where;
}
