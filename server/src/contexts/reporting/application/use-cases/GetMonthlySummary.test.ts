import { describe, expect, it } from 'vitest';
import { Money } from '../../../../shared-kernel/money/Money.js';
import { err, ok, type Result } from '../../../../shared-kernel/result/Result.js';
import { MixedCurrencyInRangeError } from '../../domain/errors/ReportingErrors.js';
import { type IReportingReadRepository } from '../../domain/repositories/IReportingReadRepository.js';
import { type MonthlySummary } from '../../domain/value-objects/MonthlySummary.js';
import { type NetOwedSnapshot } from '../../domain/value-objects/NetOwed.js';
import { GetMonthlySummary } from './GetMonthlySummary.js';

class FakeRepo implements IReportingReadRepository {
  capturedRange: { month: string; start: Date; end: Date } | null = null;
  result: Result<MonthlySummary, MixedCurrencyInRangeError> = ok(emptySummary('2026-05'));

  async getMonthlySummary(range: {
    month: string;
    start: Date;
    end: Date;
  }): Promise<Result<MonthlySummary, MixedCurrencyInRangeError>> {
    this.capturedRange = range;
    return this.result;
  }
  async getNetOwed(): Promise<Result<NetOwedSnapshot, MixedCurrencyInRangeError>> {
    throw new Error('not used in this test');
  }
  async getReceipt(): Promise<Result<import('../../domain/value-objects/Receipt.js').Receipt, MixedCurrencyInRangeError>> {
    throw new Error('not used in this test');
  }
}

function emptySummary(month: string): MonthlySummary {
  const start = new Date(`${month}-01T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  return {
    month,
    start,
    end,
    currency: null,
    total: null,
    expenseCount: 0,
    byCategory: [],
    byMethod: [],
  };
}

describe('GetMonthlySummary', () => {
  it('rejects an invalid month before touching the repo', async () => {
    const repo = new FakeRepo();
    const result = await new GetMonthlySummary(repo).execute({ month: 'not-a-month' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('invalid_month');
    expect(repo.capturedRange).toBeNull();
  });

  it('forwards a parsed range to the repo', async () => {
    const repo = new FakeRepo();
    await new GetMonthlySummary(repo).execute({ month: '2026-05' });
    expect(repo.capturedRange?.month).toBe('2026-05');
    expect(repo.capturedRange?.start.toISOString()).toBe('2026-05-01T00:00:00.000Z');
    expect(repo.capturedRange?.end.toISOString()).toBe('2026-06-01T00:00:00.000Z');
  });

  it('returns the summary the repo produced', async () => {
    const repo = new FakeRepo();
    const summary: MonthlySummary = {
      ...emptySummary('2026-05'),
      currency: 'IDR',
      total: Money.fromMinor(1_500_000n, 'IDR'),
      expenseCount: 3,
      byCategory: [
        {
          categoryId: 'c1',
          categoryName: 'Food',
          bgColor: '#ffcfc9',
          textColor: '#b10202',
          total: Money.fromMinor(1_000_000n, 'IDR'),
          count: 2,
        },
      ],
      byMethod: [
        {
          methodId: 'm1',
          methodName: 'Cash',
          bgColor: '#e8eaed',
          textColor: '#000000',
          total: Money.fromMinor(1_500_000n, 'IDR'),
          count: 3,
        },
      ],
    };
    repo.result = ok(summary);

    const result = await new GetMonthlySummary(repo).execute({ month: '2026-05' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.currency).toBe('IDR');
      expect(result.value.total?.equals(Money.fromMinor(1_500_000n, 'IDR'))).toBe(true);
      expect(result.value.byCategory).toHaveLength(1);
      expect(result.value.byMethod).toHaveLength(1);
    }
  });

  it('propagates a mixed-currency error from the repo', async () => {
    const repo = new FakeRepo();
    repo.result = err(new MixedCurrencyInRangeError('IDR and USD in range'));
    const result = await new GetMonthlySummary(repo).execute({ month: '2026-05' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('mixed_currency_in_range');
  });
});
