import { describe, expect, it } from 'vitest';
import { Money } from '../../../../shared-kernel/money/Money.js';
import { err, ok, type Result } from '../../../../shared-kernel/result/Result.js';
import { MixedCurrencyInRangeError } from '../../domain/errors/ReportingErrors.js';
import { type IReportingReadRepository } from '../../domain/repositories/IReportingReadRepository.js';
import { type MonthlySummary } from '../../domain/value-objects/MonthlySummary.js';
import { type NetOwedSnapshot } from '../../domain/value-objects/NetOwed.js';
import { type ExportData, type Receipt } from '../../domain/value-objects/Receipt.js';
import { ExportAllData } from './ExportAllData.js';

class FakeRepo implements IReportingReadRepository {
  exportResult: Result<ExportData, MixedCurrencyInRangeError> = ok({
    currency: null,
    lines: [],
  });
  async exportAllData(): Promise<Result<ExportData, MixedCurrencyInRangeError>> {
    return this.exportResult;
  }
  async getMonthlySummary(): Promise<Result<MonthlySummary, MixedCurrencyInRangeError>> {
    throw new Error('not used');
  }
  async getNetOwed(): Promise<Result<NetOwedSnapshot, MixedCurrencyInRangeError>> {
    throw new Error('not used');
  }
  async getReceipt(): Promise<Result<Receipt, MixedCurrencyInRangeError>> {
    throw new Error('not used');
  }
}

describe('ExportAllData', () => {
  it('returns the export data from the repository', async () => {
    const repo = new FakeRepo();
    const zero = Money.fromMinor(0n, 'IDR');
    repo.exportResult = ok({
      currency: 'IDR',
      lines: [
        {
          transactionDate: new Date('2026-05-01T00:00:00.000Z'),
          total: zero,
          out: Money.fromMinor(100000n, 'IDR'),
          formula: '=20000*5',
          unpaidTotal: zero,
          earlyTotal: zero,
          description: 'Lunch',
          category: 'Food',
          method: 'Cash',
          reimbursementStatus: 'Non-Reimbursable',
        },
      ],
    });

    const result = await new ExportAllData(repo).execute();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.currency).toBe('IDR');
    expect(result.value.lines).toHaveLength(1);
    expect(result.value.lines[0]?.out.toMajor()).toBe('100000');
  });

  it('propagates a mixed-currency error from the repository', async () => {
    const repo = new FakeRepo();
    repo.exportResult = err(new MixedCurrencyInRangeError('mixed currencies'));

    const result = await new ExportAllData(repo).execute();

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(MixedCurrencyInRangeError);
  });
});
