import { type PrismaClient } from '@prisma/client';
import { type MonthlyBudget } from '../../../domain/entities/MonthlyBudget.js';
import { type IMonthlyBudgetRepository } from '../../../domain/repositories/IMonthlyBudgetRepository.js';
import { MonthlyBudgetMapper } from '../../mappers/MonthlyBudgetMapper.js';

const SINGLETON_ID = 'singleton';

export class PrismaMonthlyBudgetRepository implements IMonthlyBudgetRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async get(): Promise<MonthlyBudget | null> {
    const row = await this.prisma.monthlyBudget.findUnique({ where: { id: SINGLETON_ID } });
    return row ? MonthlyBudgetMapper.toDomain(row) : null;
  }

  async save(budget: MonthlyBudget): Promise<void> {
    const row = MonthlyBudgetMapper.toPersistence(budget);
    await this.prisma.monthlyBudget.upsert({
      where: { id: SINGLETON_ID },
      create: {
        id: SINGLETON_ID,
        amountMinor: row.amountMinor,
        currency: row.currency,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
      update: {
        amountMinor: row.amountMinor,
        currency: row.currency,
        updatedAt: row.updatedAt,
      },
    });
  }
}
