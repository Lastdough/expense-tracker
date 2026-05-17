import { type PrismaClient } from '@prisma/client';

import { isCurrency } from '../../../../../shared-kernel/money/Currency.js';
import { Money } from '../../../../../shared-kernel/money/Money.js';
import { err, ok, type Result } from '../../../../../shared-kernel/result/Result.js';
import { MixedCurrencyInRangeError } from '../../../domain/errors/ReportingErrors.js';
import { type IReportingReadRepository } from '../../../domain/repositories/IReportingReadRepository.js';
import {
  type CategoryBreakdownRow,
  type MethodBreakdownRow,
  type MonthlySummary,
} from '../../../domain/value-objects/MonthlySummary.js';

/**
 * Read-only Prisma-backed implementation. Reads Expense + Category + Method
 * tables directly. No imports from other contexts' source code — the
 * dependency rule's cross-context boundary is preserved at the import level.
 */
export class PrismaReportingReadRepository implements IReportingReadRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getMonthlySummary(range: {
    month: string;
    start: Date;
    end: Date;
  }): Promise<Result<MonthlySummary, MixedCurrencyInRangeError>> {
    const where = { transactionDate: { gte: range.start, lt: range.end } };

    const currencies = await this.prisma.expense.findMany({
      where,
      distinct: ['currency'],
      select: { currency: true },
    });

    const [first, ...rest] = currencies;
    if (first === undefined) {
      return ok(emptySummary(range));
    }
    if (rest.length > 0) {
      const list = currencies.map((c) => c.currency).join(', ');
      return err(
        new MixedCurrencyInRangeError(
          `Cannot summarize ${range.month}: range contains mixed currencies (${list})`,
        ),
      );
    }

    const currency = first.currency;
    if (!isCurrency(currency)) {
      throw new RangeError(
        `PrismaReportingReadRepository: persisted currency "${currency}" is not supported`,
      );
    }

    const [totalAgg, countAgg, byCategoryRaw, byMethodRaw] = await Promise.all([
      this.prisma.expense.aggregate({ where, _sum: { amountMinor: true } }),
      this.prisma.expense.count({ where }),
      this.prisma.expense.groupBy({
        by: ['categoryId'],
        where,
        _sum: { amountMinor: true },
        _count: { _all: true },
      }),
      this.prisma.expense.groupBy({
        by: ['methodId'],
        where,
        _sum: { amountMinor: true },
        _count: { _all: true },
      }),
    ]);

    const categoryIds = byCategoryRaw.map((r) => r.categoryId);
    const methodIds = byMethodRaw.map((r) => r.methodId);

    const [categories, methods] = await Promise.all([
      this.prisma.category.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true, name: true, bgColor: true, textColor: true },
      }),
      this.prisma.method.findMany({
        where: { id: { in: methodIds } },
        select: { id: true, name: true, bgColor: true, textColor: true },
      }),
    ]);
    const categoriesById = new Map(categories.map((c) => [c.id, c]));
    const methodsById = new Map(methods.map((m) => [m.id, m]));

    const byCategory: CategoryBreakdownRow[] = byCategoryRaw
      .map((row) => {
        const cat = categoriesById.get(row.categoryId);
        return {
          categoryId: row.categoryId,
          categoryName: cat?.name ?? '(unknown)',
          bgColor: cat?.bgColor ?? '#e8eaed',
          textColor: cat?.textColor ?? '#000000',
          total: Money.fromMinor(row._sum.amountMinor ?? 0n, currency),
          count: row._count._all,
        };
      })
      .sort((a, b) => b.total.compare(a.total));

    const byMethod: MethodBreakdownRow[] = byMethodRaw
      .map((row) => {
        const meth = methodsById.get(row.methodId);
        return {
          methodId: row.methodId,
          methodName: meth?.name ?? '(unknown)',
          bgColor: meth?.bgColor ?? '#e8eaed',
          textColor: meth?.textColor ?? '#000000',
          total: Money.fromMinor(row._sum.amountMinor ?? 0n, currency),
          count: row._count._all,
        };
      })
      .sort((a, b) => b.total.compare(a.total));

    return ok({
      month: range.month,
      start: range.start,
      end: range.end,
      currency,
      total: Money.fromMinor(totalAgg._sum.amountMinor ?? 0n, currency),
      expenseCount: countAgg,
      byCategory,
      byMethod,
    });
  }
}

function emptySummary(range: { month: string; start: Date; end: Date }): MonthlySummary {
  return {
    month: range.month,
    start: range.start,
    end: range.end,
    currency: null,
    total: null,
    expenseCount: 0,
    byCategory: [],
    byMethod: [],
  };
}
