import { describe, expect, it } from 'vitest';
import { Money } from '../../../../shared-kernel/money/Money.js';
import { ok, type Result } from '../../../../shared-kernel/result/Result.js';
import { MonthlyBudget } from '../../../budgeting/domain/entities/MonthlyBudget.js';
import { type IMonthlyBudgetRepository } from '../../../budgeting/domain/repositories/IMonthlyBudgetRepository.js';
import { GetMonthlyBudget } from '../../../budgeting/application/use-cases/GetMonthlyBudget.js';
import { MixedCurrencyInRangeError } from '../../domain/errors/ReportingErrors.js';
import { type IReportingReadRepository } from '../../domain/repositories/IReportingReadRepository.js';
import { type MonthlySummary } from '../../domain/value-objects/MonthlySummary.js';
import { type NetOwedSnapshot } from '../../domain/value-objects/NetOwed.js';
import { GetAvailableBudget } from './GetAvailableBudget.js';
import { GetNetOwed } from './GetNetOwed.js';

class FakeBudgetRepo implements IMonthlyBudgetRepository {
  current: MonthlyBudget | null = null;
  async get(): Promise<MonthlyBudget | null> {
    return this.current;
  }
  async save(b: MonthlyBudget): Promise<void> {
    this.current = b;
  }
}

class FakeReportingRepo implements IReportingReadRepository {
  snapshot: Result<NetOwedSnapshot, MixedCurrencyInRangeError> = ok({
    dateStart: new Date(0),
    dateEnd: new Date(0),
    currency: null,
    sumUnpaid: null,
    sumEarly: null,
    netOwed: null,
  });
  async getMonthlySummary(): Promise<Result<MonthlySummary, MixedCurrencyInRangeError>> {
    throw new Error('not used');
  }
  async getNetOwed(): Promise<Result<NetOwedSnapshot, MixedCurrencyInRangeError>> {
    return this.snapshot;
  }
  async getReceipt(): Promise<Result<import('../../domain/value-objects/Receipt.js').Receipt, MixedCurrencyInRangeError>> {
    throw new Error('not used');
  }
}

function makeUseCase(): {
  uc: GetAvailableBudget;
  budgetRepo: FakeBudgetRepo;
  reportingRepo: FakeReportingRepo;
} {
  const budgetRepo = new FakeBudgetRepo();
  const reportingRepo = new FakeReportingRepo();
  const uc = new GetAvailableBudget(
    new GetMonthlyBudget(budgetRepo),
    new GetNetOwed(reportingRepo),
  );
  return { uc, budgetRepo, reportingRepo };
}

describe('GetAvailableBudget', () => {
  it('rejects an invalid month before touching the repos', async () => {
    const { uc } = makeUseCase();
    const result = await uc.execute({ month: 'not-a-month' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('invalid_month');
  });

  it('returns nulls for monthlyBudget/availableBudget when no budget is set', async () => {
    const { uc } = makeUseCase();
    const result = await uc.execute({ month: '2026-05' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.monthlyBudget).toBeNull();
      expect(result.value.availableBudget).toBeNull();
      expect(result.value.month).toBe('2026-05');
    }
  });

  it('computes availableBudget = monthlyBudget when there are no Unpaid/Early in the month', async () => {
    const { uc, budgetRepo } = makeUseCase();
    budgetRepo.current = MonthlyBudget.create({
      amount: Money.fromMinor(5_000_000n, 'IDR'),
      now: new Date('2026-05-01T00:00:00Z'),
    });
    const result = await uc.execute({ month: '2026-05' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.currency).toBe('IDR');
      expect(result.value.monthlyBudget?.equals(Money.fromMinor(5_000_000n, 'IDR'))).toBe(true);
      expect(result.value.netOwed?.isZero()).toBe(true);
      expect(result.value.availableBudget?.equals(Money.fromMinor(5_000_000n, 'IDR'))).toBe(true);
    }
  });

  it('computes availableBudget = monthlyBudget - netOwed when reimbursables exist', async () => {
    const { uc, budgetRepo, reportingRepo } = makeUseCase();
    budgetRepo.current = MonthlyBudget.create({
      amount: Money.fromMinor(5_000_000n, 'IDR'),
      now: new Date('2026-05-01T00:00:00Z'),
    });
    reportingRepo.snapshot = ok({
      dateStart: new Date('2026-05-01T00:00:00Z'),
      dateEnd: new Date('2026-06-01T00:00:00Z'),
      currency: 'IDR',
      sumUnpaid: Money.fromMinor(1_500_000n, 'IDR'),
      sumEarly: Money.fromMinor(500_000n, 'IDR'),
      // netOwed = Unpaid - Early = 1M
      netOwed: Money.fromMinor(1_000_000n, 'IDR'),
    });
    const result = await uc.execute({ month: '2026-05' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.availableBudget?.equals(Money.fromMinor(4_000_000n, 'IDR'))).toBe(true);
      expect(result.value.netOwed?.equals(Money.fromMinor(1_000_000n, 'IDR'))).toBe(true);
    }
  });

  it('errors when budget currency != expenses currency', async () => {
    const { uc, budgetRepo, reportingRepo } = makeUseCase();
    budgetRepo.current = MonthlyBudget.create({
      amount: Money.fromMinor(500_000n, 'USD'),
      now: new Date('2026-05-01T00:00:00Z'),
    });
    reportingRepo.snapshot = ok({
      dateStart: new Date('2026-05-01T00:00:00Z'),
      dateEnd: new Date('2026-06-01T00:00:00Z'),
      currency: 'IDR',
      sumUnpaid: Money.fromMinor(1_000_000n, 'IDR'),
      sumEarly: Money.fromMinor(0n, 'IDR'),
      netOwed: Money.fromMinor(1_000_000n, 'IDR'),
    });
    const result = await uc.execute({ month: '2026-05' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('budget_currency_mismatch');
  });
});
