import { describe, expect, it } from 'vitest';
import { Money } from '../../../../shared-kernel/money/Money.js';
import { err, ok, type Result } from '../../../../shared-kernel/result/Result.js';
import { MixedCurrencyInRangeError } from '../../domain/errors/ReportingErrors.js';
import { type IReportingReadRepository } from '../../domain/repositories/IReportingReadRepository.js';
import { type MonthlySummary } from '../../domain/value-objects/MonthlySummary.js';
import { type NetOwedSnapshot } from '../../domain/value-objects/NetOwed.js';
import { GetNetOwed } from './GetNetOwed.js';
import { ExportData } from '../../domain/value-objects/Receipt.js';

class FakeRepo implements IReportingReadRepository {
  exportAllData(): Promise<Result<ExportData, MixedCurrencyInRangeError>> {
      throw new Error('Method not implemented.');
  }
  netOwedResult: Result<NetOwedSnapshot, MixedCurrencyInRangeError> = ok({
    dateStart: new Date(0),
    dateEnd: new Date(0),
    currency: null,
    sumUnpaid: null,
    sumEarly: null,
    netOwed: null,
  });
  captured: { start: Date; end: Date } | null = null;
  async getMonthlySummary(): Promise<Result<MonthlySummary, MixedCurrencyInRangeError>> {
    throw new Error('not used');
  }
  async getNetOwed(range: {
    start: Date;
    end: Date;
  }): Promise<Result<NetOwedSnapshot, MixedCurrencyInRangeError>> {
    this.captured = range;
    return this.netOwedResult;
  }
  async getReceipt(): Promise<Result<import('../../domain/value-objects/Receipt.js').Receipt, MixedCurrencyInRangeError>> {
    throw new Error('not used');
  }
}

const D = (s: string) => new Date(s);

describe('GetNetOwed', () => {
  it('rejects an invalid date pair', async () => {
    const repo = new FakeRepo();
    const result = await new GetNetOwed(repo).execute({
      dateStart: new Date('not-a-date'),
      dateEnd: D('2026-05-31T00:00:00Z'),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('invalid_date_range');
  });

  it('rejects when start >= end', async () => {
    const repo = new FakeRepo();
    const result = await new GetNetOwed(repo).execute({
      dateStart: D('2026-05-31T00:00:00Z'),
      dateEnd: D('2026-05-01T00:00:00Z'),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('invalid_date_range');
  });

  it('forwards the range to the repo and returns its snapshot', async () => {
    const repo = new FakeRepo();
    repo.netOwedResult = ok({
      dateStart: D('2026-05-01T00:00:00Z'),
      dateEnd: D('2026-06-01T00:00:00Z'),
      currency: 'IDR',
      sumUnpaid: Money.fromMinor(1_000_000n, 'IDR'),
      sumEarly: Money.fromMinor(200_000n, 'IDR'),
      netOwed: Money.fromMinor(800_000n, 'IDR'),
    });

    const result = await new GetNetOwed(repo).execute({
      dateStart: D('2026-05-01T00:00:00Z'),
      dateEnd: D('2026-06-01T00:00:00Z'),
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.netOwed?.equals(Money.fromMinor(800_000n, 'IDR'))).toBe(true);
    }
    expect(repo.captured?.start.toISOString()).toBe('2026-05-01T00:00:00.000Z');
    expect(repo.captured?.end.toISOString()).toBe('2026-06-01T00:00:00.000Z');
  });

  it('propagates a mixed-currency error from the repo', async () => {
    const repo = new FakeRepo();
    repo.netOwedResult = err(new MixedCurrencyInRangeError('IDR and USD'));
    const result = await new GetNetOwed(repo).execute({
      dateStart: D('2026-05-01T00:00:00Z'),
      dateEnd: D('2026-06-01T00:00:00Z'),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('mixed_currency_in_range');
  });
});
