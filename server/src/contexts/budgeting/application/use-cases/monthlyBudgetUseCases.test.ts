import { beforeEach, describe, expect, it } from 'vitest';
import { Money } from '../../../../shared-kernel/money/Money.js';
import { MonthlyBudget } from '../../domain/entities/MonthlyBudget.js';
import { type IMonthlyBudgetRepository } from '../../domain/repositories/IMonthlyBudgetRepository.js';
import { GetMonthlyBudget } from './GetMonthlyBudget.js';
import { SetMonthlyBudget } from './SetMonthlyBudget.js';

class FakeRepo implements IMonthlyBudgetRepository {
  current: MonthlyBudget | null = null;
  saveCount = 0;
  async get(): Promise<MonthlyBudget | null> {
    return this.current;
  }
  async save(b: MonthlyBudget): Promise<void> {
    this.current = b;
    this.saveCount += 1;
  }
}

describe('GetMonthlyBudget', () => {
  it('returns { budget: null } when nothing is set', async () => {
    const result = await new GetMonthlyBudget(new FakeRepo()).execute();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.budget).toBeNull();
  });

  it('returns the persisted budget when one exists', async () => {
    const repo = new FakeRepo();
    repo.current = MonthlyBudget.create({
      amount: Money.fromMinor(5_000_000n, 'IDR'),
      now: new Date('2026-05-17T10:00:00.000Z'),
    });
    const result = await new GetMonthlyBudget(repo).execute();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.budget).not.toBeNull();
      expect(result.value.budget?.amount.equals(Money.fromMinor(5_000_000n, 'IDR'))).toBe(true);
    }
  });
});

describe('SetMonthlyBudget', () => {
  const NOW = new Date('2026-05-17T10:00:00.000Z');
  const LATER = new Date('2026-05-17T11:00:00.000Z');
  let repo: FakeRepo;
  beforeEach(() => {
    repo = new FakeRepo();
  });

  it('creates the singleton on first call', async () => {
    const result = await new SetMonthlyBudget(repo, () => NOW).execute({
      amountMajor: '5000000',
      currency: 'IDR',
    });
    expect(result.ok).toBe(true);
    expect(repo.current).not.toBeNull();
    expect(repo.current?.amount.equals(Money.fromMinor(5_000_000n, 'IDR'))).toBe(true);
    expect(repo.current?.createdAt).toBe(NOW);
    expect(repo.current?.updatedAt).toBe(NOW);
  });

  it('updates the existing singleton on subsequent calls, preserving createdAt', async () => {
    const setter = new SetMonthlyBudget(repo, () => NOW);
    await setter.execute({ amountMajor: '5000000', currency: 'IDR' });
    const created = repo.current?.createdAt;

    const later = new SetMonthlyBudget(repo, () => LATER);
    const second = await later.execute({ amountMajor: '7500000', currency: 'IDR' });
    expect(second.ok).toBe(true);
    expect(repo.current?.amount.equals(Money.fromMinor(7_500_000n, 'IDR'))).toBe(true);
    expect(repo.current?.createdAt).toBe(created);
    expect(repo.current?.updatedAt).toBe(LATER);
  });

  it('rejects an unsupported currency without touching the repo', async () => {
    const result = await new SetMonthlyBudget(repo, () => NOW).execute({
      amountMajor: '5000000',
      currency: 'XYZ',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('unsupported_currency');
    expect(repo.saveCount).toBe(0);
  });

  it('rejects a malformed amount', async () => {
    const result = await new SetMonthlyBudget(repo, () => NOW).execute({
      amountMajor: 'NaN',
      currency: 'IDR',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('invalid_monthly_budget_amount');
    expect(repo.saveCount).toBe(0);
  });

  it('rejects a fraction longer than the currency allows', async () => {
    const result = await new SetMonthlyBudget(repo, () => NOW).execute({
      amountMajor: '100.50', // IDR has 0 minor units
      currency: 'IDR',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('invalid_monthly_budget_amount');
  });

  it('rejects a negative amount', async () => {
    const result = await new SetMonthlyBudget(repo, () => NOW).execute({
      amountMajor: '-1',
      currency: 'IDR',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('invalid_monthly_budget_amount');
    expect(repo.saveCount).toBe(0);
  });

  it('accepts zero', async () => {
    const result = await new SetMonthlyBudget(repo, () => NOW).execute({
      amountMajor: '0',
      currency: 'IDR',
    });
    expect(result.ok).toBe(true);
    expect(repo.current?.amount.isZero()).toBe(true);
  });

  it('accepts a USD amount with two fractional digits', async () => {
    const result = await new SetMonthlyBudget(repo, () => NOW).execute({
      amountMajor: '1234.50',
      currency: 'USD',
    });
    expect(result.ok).toBe(true);
    expect(repo.current?.amount.equals(Money.fromMinor(123_450n, 'USD'))).toBe(true);
  });
});
