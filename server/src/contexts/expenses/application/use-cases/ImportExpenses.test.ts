import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';

import { InMemoryEventBus } from '../../../../shared-kernel/domain-events/InMemoryEventBus.js';
import { type DomainEvent } from '../../../../shared-kernel/domain-events/DomainEvent.js';
import { CategoryLookup } from '../../../categorization/application/services/CategoryLookup.js';
import { MethodLookup } from '../../../categorization/application/services/MethodLookup.js';
import { ReimbursementStatusLookup } from '../../../categorization/application/services/ReimbursementStatusLookup.js';
import { Category } from '../../../categorization/domain/entities/Category.js';
import { Method } from '../../../categorization/domain/entities/Method.js';
import { ReimbursementStatus } from '../../../categorization/domain/entities/ReimbursementStatus.js';
import { type ICategoryRepository } from '../../../categorization/domain/repositories/ICategoryRepository.js';
import { type IMethodRepository } from '../../../categorization/domain/repositories/IMethodRepository.js';
import { type IReimbursementStatusRepository } from '../../../categorization/domain/repositories/IReimbursementStatusRepository.js';
import { CategoryId } from '../../../categorization/domain/value-objects/CategoryId.js';
import { MethodId } from '../../../categorization/domain/value-objects/MethodId.js';
import { ReimbursementStatusId } from '../../../categorization/domain/value-objects/ReimbursementStatusId.js';
import { type Expense } from '../../domain/entities/Expense.js';
import { ExpenseRecorded } from '../../domain/events/ExpenseRecorded.js';
import {
  type ExpenseSearchCriteria,
  type ExpenseSearchResult,
  type IExpenseRepository,
} from '../../domain/repositories/IExpenseRepository.js';
import { type ExpenseId } from '../../domain/value-objects/ExpenseId.js';
import { ImportExpenses } from './ImportExpenses.js';

class NameSearchableCategoryRepo implements ICategoryRepository {
  readonly rows = new Map<string, Category>();
  async save(c: Category): Promise<void> {
    this.rows.set(c.id, c);
  }
  async saveMany(): Promise<void> {}
  async findById(id: CategoryId): Promise<Category | null> {
    return this.rows.get(id) ?? null;
  }
  async findByNormalizedName(normalized: string): Promise<Category | null> {
    for (const c of this.rows.values()) {
      if (c.nameNormalized === normalized) return c;
    }
    return null;
  }
  async listAll(): Promise<Category[]> {
    return [...this.rows.values()];
  }
  async listActive(): Promise<Category[]> {
    return [...this.rows.values()].filter((c) => !c.isArchived);
  }
  async nextDisplayOrder(): Promise<number> {
    return this.rows.size;
  }
}

class NameSearchableMethodRepo implements IMethodRepository {
  readonly rows = new Map<string, Method>();
  async save(m: Method): Promise<void> {
    this.rows.set(m.id, m);
  }
  async saveMany(): Promise<void> {}
  async findById(id: MethodId): Promise<Method | null> {
    return this.rows.get(id) ?? null;
  }
  async findByNormalizedName(normalized: string): Promise<Method | null> {
    for (const m of this.rows.values()) {
      if (m.nameNormalized === normalized) return m;
    }
    return null;
  }
  async listAll(): Promise<Method[]> {
    return [...this.rows.values()];
  }
  async listActive(): Promise<Method[]> {
    return [...this.rows.values()].filter((m) => !m.isArchived);
  }
  async nextDisplayOrder(): Promise<number> {
    return this.rows.size;
  }
}

class NameSearchableStatusRepo implements IReimbursementStatusRepository {
  readonly rows = new Map<string, ReimbursementStatus>();
  async save(s: ReimbursementStatus): Promise<void> {
    this.rows.set(s.id, s);
  }
  async saveMany(): Promise<void> {}
  async findById(id: ReimbursementStatusId): Promise<ReimbursementStatus | null> {
    return this.rows.get(id) ?? null;
  }
  async findByNormalizedName(normalized: string): Promise<ReimbursementStatus | null> {
    for (const s of this.rows.values()) {
      if (s.nameNormalized === normalized) return s;
    }
    return null;
  }
  async listAll(): Promise<ReimbursementStatus[]> {
    return [...this.rows.values()];
  }
  async listActive(): Promise<ReimbursementStatus[]> {
    return [...this.rows.values()].filter((s) => !s.isArchived);
  }
  async nextDisplayOrder(): Promise<number> {
    return this.rows.size;
  }
}

class StagingExpenseRepo implements IExpenseRepository {
  readonly rows = new Map<string, Expense>();
  saveManyCalls = 0;
  async save(): Promise<void> {
    throw new Error('Import should go through saveMany');
  }
  async saveMany(es: readonly Expense[]): Promise<void> {
    this.saveManyCalls++;
    for (const e of es) this.rows.set(e.id, e);
  }
  async delete(): Promise<void> {}
  async findById(id: ExpenseId): Promise<Expense | null> {
    return this.rows.get(id) ?? null;
  }
  async findInDateRange(): Promise<Expense[]> {
    return [];
  }
  async search(_criteria: ExpenseSearchCriteria): Promise<ExpenseSearchResult> {
    return { items: [], total: 0 };
  }
}

function buildHarness() {
  const categoryRepo = new NameSearchableCategoryRepo();
  const methodRepo = new NameSearchableMethodRepo();
  const statusRepo = new NameSearchableStatusRepo();
  const expenseRepo = new StagingExpenseRepo();
  const eventBus = new InMemoryEventBus();
  const captured: DomainEvent<unknown>[] = [];
  eventBus.subscribe(ExpenseRecorded.type, (e) => {
    captured.push(e);
  });

  // Seed the canonical reference data set from CLAUDE.md (subset).
  const seedCategory = (name: string) =>
    categoryRepo.save(
      Category.create({
        id: CategoryId.create(randomUUID()),
        name,
        bgColor: '#e8eaed',
        textColor: '#000000',
        displayOrder: categoryRepo.rows.size,
      }),
    );
  const seedMethod = (name: string) =>
    methodRepo.save(
      Method.create({
        id: MethodId.create(randomUUID()),
        name,
        bgColor: '#e8eaed',
        textColor: '#000000',
        displayOrder: methodRepo.rows.size,
      }),
    );
  const seedStatus = (name: string) =>
    statusRepo.save(
      ReimbursementStatus.create({
        id: ReimbursementStatusId.create(randomUUID()),
        name,
        bgColor: '#e8eaed',
        textColor: '#000000',
        displayOrder: statusRepo.rows.size,
        kind: 'NonReimbursable',
      }),
    );

  return {
    categoryRepo,
    methodRepo,
    statusRepo,
    expenseRepo,
    eventBus,
    captured,
    seedCategory,
    seedMethod,
    seedStatus,
  };
}

function buildUseCase(h: ReturnType<typeof buildHarness>): ImportExpenses {
  return new ImportExpenses(
    h.expenseRepo,
    new CategoryLookup(h.categoryRepo),
    new MethodLookup(h.methodRepo),
    new ReimbursementStatusLookup(h.statusRepo),
    h.eventBus,
    () => new Date('2026-05-18T12:00:00.000Z'),
  );
}

const HEADER = 'Days,Transaction Date,Out (Rp.),Description,Category,Method,Reimbursement';

describe('ImportExpenses', () => {
  let h: ReturnType<typeof buildHarness>;

  beforeEach(async () => {
    h = buildHarness();
    await Promise.all([
      h.seedCategory('Food'),
      h.seedCategory('Transportations'),
      h.seedCategory('Healthcare'),
      h.seedMethod('Gopay'),
      h.seedMethod('Mandiri'),
      h.seedStatus('Non-Reimbursable'),
      h.seedStatus('Unpaid Reimbursable'),
      h.seedStatus('Early Reimbursement'),
    ]);
  });

  it('imports a valid CSV in commit mode (single transaction, events published)', async () => {
    const csv = [
      HEADER,
      'Kamis,23 Apr,Rp95.000,Coffee,Food,Gopay,non-reimbursable',
      'Rabu,6 Mei,Rp716.760,Movie,Food,Mandiri,unpaid-reimbursable',
    ].join('\n');

    const result = await buildUseCase(h).execute({
      csvText: csv,
      defaultYear: 2025,
      dryRun: false,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.totalRows).toBe(2);
    expect(result.value.validRows).toBe(2);
    expect(result.value.invalidRows).toBe(0);
    expect(result.value.committed).toBe(true);
    expect(h.expenseRepo.saveManyCalls).toBe(1);
    expect(h.expenseRepo.rows.size).toBe(2);
    expect(h.captured).toHaveLength(2);
  });

  it('dry-run validates but does not persist or publish', async () => {
    const csv = [
      HEADER,
      'Kamis,23 Apr,Rp95.000,Coffee,Food,Gopay,non-reimbursable',
    ].join('\n');

    const result = await buildUseCase(h).execute({
      csvText: csv,
      defaultYear: 2025,
      dryRun: true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.dryRun).toBe(true);
    expect(result.value.committed).toBe(false);
    expect(result.value.validRows).toBe(1);
    expect(h.expenseRepo.saveManyCalls).toBe(0);
    expect(h.expenseRepo.rows.size).toBe(0);
    expect(h.captured).toHaveLength(0);
  });

  it('all-or-nothing: one bad row aborts the whole commit', async () => {
    const csv = [
      HEADER,
      'Kamis,23 Apr,Rp95.000,Coffee,Food,Gopay,non-reimbursable',
      'Rabu,40 Feb,Rp50.000,Bad date,Food,Gopay,non-reimbursable', // invalid date
      'Rabu,6 Mei,Rp716.760,Movie,Food,Mandiri,unpaid-reimbursable',
    ].join('\n');

    const result = await buildUseCase(h).execute({
      csvText: csv,
      defaultYear: 2025,
      dryRun: false,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.totalRows).toBe(3);
    expect(result.value.validRows).toBe(2);
    expect(result.value.invalidRows).toBe(1);
    expect(result.value.committed).toBe(false);
    expect(h.expenseRepo.saveManyCalls).toBe(0);
    expect(h.expenseRepo.rows.size).toBe(0);
    expect(h.captured).toHaveLength(0);
    // The valid rows still report status === 'ok' but expenseId is cleared.
    expect(result.value.rows[0]?.status).toBe('ok');
    expect(result.value.rows[0]?.expenseId).toBeNull();
    expect(result.value.rows[1]?.status).toBe('error');
    expect(result.value.rows[1]?.error?.field).toBe('transaction date');
  });

  it('suggests closest existing category name when one is unknown', async () => {
    const csv = [
      HEADER,
      'Kamis,23 Apr,Rp95.000,Coffee,Foods,Gopay,non-reimbursable', // "Foods" instead of "Food"
    ].join('\n');

    const result = await buildUseCase(h).execute({
      csvText: csv,
      defaultYear: 2025,
      dryRun: true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.rows[0]?.error?.code).toBe('reference_not_found');
    expect(result.value.rows[0]?.error?.field).toBe('category');
    expect(result.value.rows[0]?.error?.suggestion).toBe('Food');
    expect(result.value.rows[0]?.error?.message).toContain('did you mean "Food"');
  });

  it('rejects CSV missing a required column', async () => {
    const csv = [
      'Days,Transaction Date,Out (Rp.),Description,Category,Method', // no Reimbursement
      'Kamis,23 Apr,Rp95.000,Coffee,Food,Gopay',
    ].join('\n');

    const result = await buildUseCase(h).execute({
      csvText: csv,
      defaultYear: 2025,
      dryRun: true,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('missing_sheets_column');
  });

  it('handles trailing whitespace on header and cell values', async () => {
    // Trailing space on "Reimbursement " header (matches real Sheets export);
    // trailing space on "Healthcare " (matches row 103 of redacted CSV).
    const csv = [
      'Days,Transaction Date,Out (Rp.),Description,Category,Method,Reimbursement ',
      'Senin,30 Mar,Rp244.150,Pharmacy,Healthcare ,Gopay,unpaid-reimbursable',
    ].join('\n');

    const result = await buildUseCase(h).execute({
      csvText: csv,
      defaultYear: 2025,
      dryRun: true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.invalidRows).toBe(0);
  });

  it('treats negative amount as Early Reimbursement and stores abs amount', async () => {
    const csv = [
      HEADER,
      'Kamis,23 Apr,-Rp7.630.945,Refund Bukalapak,Healthcare,Mandiri,early-reimburse',
    ].join('\n');

    const result = await buildUseCase(h).execute({
      csvText: csv,
      defaultYear: 2025,
      dryRun: false,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.committed).toBe(true);
    const persisted = [...h.expenseRepo.rows.values()][0];
    expect(persisted?.amount.amount).toBe(7630945n);
    expect(persisted?.amount.currency).toBe('IDR');
  });

  it('rejects empty CSV (no data rows after header)', async () => {
    const csv = HEADER + '\n';
    const result = await buildUseCase(h).execute({
      csvText: csv,
      defaultYear: 2025,
      dryRun: true,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.totalRows).toBe(0);
    expect(result.value.committed).toBe(false);
  });
});
