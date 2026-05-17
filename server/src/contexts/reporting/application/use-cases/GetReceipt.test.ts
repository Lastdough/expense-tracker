import { describe, expect, it } from 'vitest';
import { Money } from '../../../../shared-kernel/money/Money.js';
import { ok, type Result } from '../../../../shared-kernel/result/Result.js';
import { MixedCurrencyInRangeError } from '../../domain/errors/ReportingErrors.js';
import { type IReportingReadRepository } from '../../domain/repositories/IReportingReadRepository.js';
import { type MonthlySummary } from '../../domain/value-objects/MonthlySummary.js';
import { type NetOwedSnapshot } from '../../domain/value-objects/NetOwed.js';
import { type Receipt } from '../../domain/value-objects/Receipt.js';
import { GetReceipt } from './GetReceipt.js';

class FakeRepo implements IReportingReadRepository {
  receiptResult: Result<Receipt, MixedCurrencyInRangeError> = ok({
    dateStart: new Date(0),
    dateEnd: new Date(0),
    currency: null,
    lines: [],
    grandTotal: null,
  });
  captured: { start: Date; end: Date } | null = null;
  async getMonthlySummary(): Promise<Result<MonthlySummary, MixedCurrencyInRangeError>> {
    throw new Error('not used');
  }
  async getNetOwed(): Promise<Result<NetOwedSnapshot, MixedCurrencyInRangeError>> {
    throw new Error('not used');
  }
  async getReceipt(range: {
    start: Date;
    end: Date;
  }): Promise<Result<Receipt, MixedCurrencyInRangeError>> {
    this.captured = range;
    return this.receiptResult;
  }
}

const D = (s: string) => new Date(s);

describe('GetReceipt', () => {
  it('rejects an invalid date pair', async () => {
    const repo = new FakeRepo();
    const result = await new GetReceipt(repo).execute({
      dateStart: D('not-a-date'),
      dateEnd: D('2026-05-31T00:00:00Z'),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('invalid_date_range');
  });

  it('rejects when start >= end', async () => {
    const repo = new FakeRepo();
    const result = await new GetReceipt(repo).execute({
      dateStart: D('2026-05-31T00:00:00Z'),
      dateEnd: D('2026-05-01T00:00:00Z'),
    });
    expect(result.ok).toBe(false);
  });

  it('forwards a valid range and returns the receipt', async () => {
    const repo = new FakeRepo();
    repo.receiptResult = ok({
      dateStart: D('2026-05-01T00:00:00Z'),
      dateEnd: D('2026-06-01T00:00:00Z'),
      currency: 'IDR',
      lines: [
        {
          description: 'Lunch with Bob',
          unpaidTotal: Money.fromMinor(1_000_000n, 'IDR'),
          earlyTotal: Money.fromMinor(0n, 'IDR'),
          total: Money.fromMinor(1_000_000n, 'IDR'),
          unpaidCount: 1,
          earlyCount: 0,
        },
      ],
      grandTotal: Money.fromMinor(1_000_000n, 'IDR'),
    });

    const result = await new GetReceipt(repo).execute({
      dateStart: D('2026-05-01T00:00:00Z'),
      dateEnd: D('2026-06-01T00:00:00Z'),
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.lines).toHaveLength(1);
      expect(result.value.grandTotal?.equals(Money.fromMinor(1_000_000n, 'IDR'))).toBe(true);
    }
  });
});
