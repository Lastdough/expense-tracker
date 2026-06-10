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
import { type NetOwedSnapshot } from '../../../domain/value-objects/NetOwed.js';
import { type ExportData, type Receipt, type ReceiptLine } from '../../../domain/value-objects/Receipt.js';

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
          `Cannot summarize ${ range.month }: range contains mixed currencies (${ list })`,
        ),
      );
    }

    const currency = first.currency;
    if (!isCurrency(currency)) {
      throw new RangeError(
        `PrismaReportingReadRepository: persisted currency "${ currency }" is not supported`,
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

  async getNetOwed(range: {
    start: Date;
    end: Date;
  }): Promise<Result<NetOwedSnapshot, MixedCurrencyInRangeError>> {
    const rows = await this.prisma.reimbursement.findMany({
      where: {
        kind: { in: ['UnpaidReimbursable', 'EarlyReimbursement'] },
        expense: { transactionDate: { gte: range.start, lt: range.end } },
      },
      select: {
        kind: true,
        expense: { select: { amountMinor: true, currency: true } },
      },
    });

    if (rows.length === 0) {
      return ok(emptyNetOwed(range));
    }

    const currencySet = new Set(rows.map((r) => r.expense.currency));
    if (currencySet.size > 1) {
      const list = [...currencySet].join(', ');
      return err(
        new MixedCurrencyInRangeError(
          `Cannot compute netOwed: range contains mixed currencies (${ list })`,
        ),
      );
    }

    const [currencyRaw] = currencySet;
    if (currencyRaw === undefined || !isCurrency(currencyRaw)) {
      throw new RangeError(
        `PrismaReportingReadRepository: persisted currency "${ currencyRaw }" is not supported`,
      );
    }
    const currency = currencyRaw;

    let sumUnpaidMinor = 0n;
    let sumEarlyMinor = 0n;
    for (const row of rows) {
      if (row.kind === 'UnpaidReimbursable') {
        sumUnpaidMinor += row.expense.amountMinor;
      } else if (row.kind === 'EarlyReimbursement') {
        sumEarlyMinor += row.expense.amountMinor;
      }
    }

    const sumUnpaid = Money.fromMinor(sumUnpaidMinor, currency);
    const sumEarly = Money.fromMinor(sumEarlyMinor, currency);
    const netOwed = sumUnpaid.subtract(sumEarly);

    return ok({
      dateStart: range.start,
      dateEnd: range.end,
      currency,
      sumUnpaid,
      sumEarly,
      netOwed,
    });
  }

  async exportAllData(): Promise<Result<ExportData, MixedCurrencyInRangeError>> {
    const queryRows = await this.prisma.reimbursement.findMany({
      select: {
        kind: true,
        expense: {
          select: {
            amountMinor: true,
            currency: true,
            description: true,
            rawInput: true,
            transactionDate: true,
            // Fetching the related tables (assuming they have a 'name' field)
            category: { select: { name: true } },
            method: { select: { name: true } },
            reimbursementStatus: { select: { name: true } },
          },
        },
      },
    });

    if (queryRows.length === 0) {
      return ok(emptyData());
    }

    const rows = queryRows.map((row) => {
      if (!row.expense) throw new Error("Reimbursement is missing expense data");

      return {
        kind: row.kind,
        amountMinor: row.expense.amountMinor,
        currency: row.expense.currency,
        description: row.expense.description,
        transactionDate: row.expense.transactionDate,
        category: row.expense.category?.name || 'Unknown',
        method: row.expense.method?.name || 'Unknown',
        reimbursement: row.expense.reimbursementStatus?.name || 'Unknown',
        rawInput: row.expense.rawInput || '',
      };
    });

    const currencySet = new Set(rows.map((r) => r.currency));
    if (currencySet.size > 1) {
      const list = [...currencySet].join(', ');
      return err(
        new MixedCurrencyInRangeError(
          `Cannot export data: range contains mixed currencies (${ list })`,
        ),
      );
    }
    const [currencyRaw] = currencySet;
    if (currencyRaw === undefined || !isCurrency(currencyRaw)) {
      throw new RangeError(
        `PrismaReportingReadRepository: persisted currency "${ currencyRaw }" is not supported`,
      );
    }
    const currency = currencyRaw;

    // 4. Map each row directly to a line item (NO GROUPING)
    const lines = rows.map((row) => {
      // Capture the actual amount regardless of status
      const actualAmount = Money.fromMinor(row.amountMinor, currency);

      // Keep your existing total logic for the "Unpaid/Early" split
      let unpaidMinor = 0n;
      let earlyMinor = 0n;

      if (row.kind === 'UnpaidReimbursable') unpaidMinor = row.amountMinor;
      else if (row.kind === 'EarlyReimbursement') earlyMinor = row.amountMinor;

      return {
        description: row.description,
        transactionDate: row.transactionDate,
        category: row.category,
        method: row.method,
        reimbursementStatus: row.reimbursement,
        out: actualAmount, // New: The true value of the transaction
        unpaidTotal: Money.fromMinor(unpaidMinor, currency),
        earlyTotal: Money.fromMinor(earlyMinor, currency),
        total: Money.fromMinor(unpaidMinor, currency).subtract(Money.fromMinor(earlyMinor, currency)),
        formula: row.rawInput,
      };
    });

    // Since we aren't grouping, sorting by Date (newest first) usually
    // makes the most sense for a flat ledger, instead of sorting by total.
    lines.sort((a, b) => b.transactionDate.getTime() - a.transactionDate.getTime());


    return ok({
      currency,
      lines,
    });
  }

  async getReceipt(range: {
    start: Date;
    end: Date;
  }): Promise<Result<Receipt, MixedCurrencyInRangeError>> {
    const rows = await this.prisma.reimbursement.findMany({
      where: {
        kind: { in: ['UnpaidReimbursable', 'EarlyReimbursement'] },
        expense: { transactionDate: { gte: range.start, lt: range.end } },
      },
      select: {
        kind: true,
        expense: { select: { amountMinor: true, currency: true, description: true } },
      },
    });

    if (rows.length === 0) {
      return ok(emptyReceipt(range));
    }

    const currencySet = new Set(rows.map((r) => r.expense.currency));
    if (currencySet.size > 1) {
      const list = [...currencySet].join(', ');
      return err(
        new MixedCurrencyInRangeError(
          `Cannot build receipt: range contains mixed currencies (${ list })`,
        ),
      );
    }
    const [currencyRaw] = currencySet;
    if (currencyRaw === undefined || !isCurrency(currencyRaw)) {
      throw new RangeError(
        `PrismaReportingReadRepository: persisted currency "${ currencyRaw }" is not supported`,
      );
    }
    const currency = currencyRaw;

    interface Acc {
      unpaidMinor: bigint;
      earlyMinor: bigint;
      unpaidCount: number;
      earlyCount: number;
    }

    const byDesc = new Map<string, Acc>();
    for (const row of rows) {
      const key = row.expense.description;
      const acc = byDesc.get(key) ?? {
        unpaidMinor: 0n,
        earlyMinor: 0n,
        unpaidCount: 0,
        earlyCount: 0,
      };
      if (row.kind === 'UnpaidReimbursable') {
        acc.unpaidMinor += row.expense.amountMinor;
        acc.unpaidCount += 1;
      } else if (row.kind === 'EarlyReimbursement') {
        acc.earlyMinor += row.expense.amountMinor;
        acc.earlyCount += 1;
      }
      byDesc.set(key, acc);
    }

    const lines: ReceiptLine[] = [...byDesc.entries()]
      .map(([description, acc]) => {
        const unpaidTotal = Money.fromMinor(acc.unpaidMinor, currency);
        const earlyTotal = Money.fromMinor(acc.earlyMinor, currency);
        return {
          description,
          unpaidTotal,
          earlyTotal,
          total: unpaidTotal.subtract(earlyTotal),
          unpaidCount: acc.unpaidCount,
          earlyCount: acc.earlyCount,
        };
      })
      .sort((a, b) => b.total.compare(a.total));

    let grandTotalMinor = 0n;
    for (const line of lines) grandTotalMinor += line.total.amount;

    return ok({
      dateStart: range.start,
      dateEnd: range.end,
      currency,
      lines,
      grandTotal: Money.fromMinor(grandTotalMinor, currency),
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

function emptyNetOwed(range: { start: Date; end: Date }): NetOwedSnapshot {
  return {
    dateStart: range.start,
    dateEnd: range.end,
    currency: null,
    sumUnpaid: null,
    sumEarly: null,
    netOwed: null,
  };
}

function emptyReceipt(range: { start: Date; end: Date }): Receipt {
  return {
    dateStart: range.start,
    dateEnd: range.end,
    currency: null,
    lines: [],
    grandTotal: null,
  };
}

function emptyData(): ExportData {
  return {
    currency: null,
    lines: [],
  };
}

