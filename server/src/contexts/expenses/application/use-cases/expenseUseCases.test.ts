import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';

import { InMemoryEventBus } from '../../../../shared-kernel/domain-events/InMemoryEventBus.js';
import { type DomainEvent } from '../../../../shared-kernel/domain-events/DomainEvent.js';
import { Money } from '../../../../shared-kernel/money/Money.js';
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
import { Expense } from '../../domain/entities/Expense.js';
import {
  ExpenseNotFoundError,
  InvalidExpenseAmountError,
  InvalidExpenseDescriptionError,
  InvalidExpenseIdError,
  InvalidPaginationError,
  ReferenceNotFoundError,
} from '../../domain/errors/ExpenseErrors.js';
import { ExpenseDeleted } from '../../domain/events/ExpenseDeleted.js';
import { ExpenseEdited } from '../../domain/events/ExpenseEdited.js';
import { ExpenseRecorded } from '../../domain/events/ExpenseRecorded.js';
import {
  type ExpenseSearchCriteria,
  type ExpenseSearchResult,
  type IExpenseRepository,
} from '../../domain/repositories/IExpenseRepository.js';
import { ExpenseId } from '../../domain/value-objects/ExpenseId.js';
import { ReferenceValidator } from '../services/ReferenceValidator.js';
import { DeleteExpense } from './DeleteExpense.js';
import { EditExpense } from './EditExpense.js';
import { GetExpense } from './GetExpense.js';
import { ListExpenses } from './ListExpenses.js';
import { RecordExpense } from './RecordExpense.js';

class FakeCategoryRepo implements ICategoryRepository {
  readonly rows = new Map<string, Category>();
  async save(c: Category): Promise<void> {
    this.rows.set(c.id, c);
  }
  async saveMany(): Promise<void> {
    /* unused */
  }
  async findById(id: CategoryId): Promise<Category | null> {
    return this.rows.get(id) ?? null;
  }
  async findByNormalizedName(): Promise<Category | null> {
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
  seed(c: Category): this {
    this.rows.set(c.id, c);
    return this;
  }
}

class FakeMethodRepo implements IMethodRepository {
  readonly rows = new Map<string, Method>();
  async save(m: Method): Promise<void> {
    this.rows.set(m.id, m);
  }
  async saveMany(): Promise<void> {
    /* unused */
  }
  async findById(id: MethodId): Promise<Method | null> {
    return this.rows.get(id) ?? null;
  }
  async findByNormalizedName(): Promise<Method | null> {
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
  seed(m: Method): this {
    this.rows.set(m.id, m);
    return this;
  }
}

class FakeStatusRepo implements IReimbursementStatusRepository {
  readonly rows = new Map<string, ReimbursementStatus>();
  async save(s: ReimbursementStatus): Promise<void> {
    this.rows.set(s.id, s);
  }
  async saveMany(): Promise<void> {
    /* unused */
  }
  async findById(id: ReimbursementStatusId): Promise<ReimbursementStatus | null> {
    return this.rows.get(id) ?? null;
  }
  async findByNormalizedName(): Promise<ReimbursementStatus | null> {
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
  seed(s: ReimbursementStatus): this {
    this.rows.set(s.id, s);
    return this;
  }
}

class FakeExpenseRepo implements IExpenseRepository {
  readonly rows = new Map<string, Expense>();
  async save(e: Expense): Promise<void> {
    this.rows.set(e.id, e);
  }
  async saveMany(es: readonly Expense[]): Promise<void> {
    for (const e of es) this.rows.set(e.id, e);
  }
  async delete(id: ExpenseId): Promise<void> {
    this.rows.delete(id);
  }
  async findById(id: ExpenseId): Promise<Expense | null> {
    return this.rows.get(id) ?? null;
  }
  async findInDateRange(range: { start: Date; end: Date }): Promise<Expense[]> {
    return [...this.rows.values()].filter(
      (e) => e.transactionDate >= range.start && e.transactionDate < range.end,
    );
  }
  async search(criteria: ExpenseSearchCriteria): Promise<ExpenseSearchResult> {
    let items = [...this.rows.values()];
    if (criteria.dateRange?.start)
      items = items.filter((e) => e.transactionDate >= criteria.dateRange!.start!);
    if (criteria.dateRange?.end)
      items = items.filter((e) => e.transactionDate < criteria.dateRange!.end!);
    if (criteria.categoryId) items = items.filter((e) => e.categoryId === criteria.categoryId);
    if (criteria.methodId) items = items.filter((e) => e.methodId === criteria.methodId);
    if (criteria.reimbursementStatusId)
      items = items.filter(
        (e) => e.reimbursementStatusId === criteria.reimbursementStatusId,
      );
    if (criteria.descriptionQuery) {
      const q = criteria.descriptionQuery.toLowerCase();
      items = items.filter((e) => e.description.toLowerCase().includes(q));
    }
    items.sort((a, b) => b.transactionDate.getTime() - a.transactionDate.getTime());
    const total = items.length;
    return { items: items.slice(criteria.offset, criteria.offset + criteria.limit), total };
  }
  seed(e: Expense): this {
    this.rows.set(e.id, e);
    return this;
  }
}

function makeCategory(args: { archived?: boolean } = {}): Category {
  return Category.create({
    id: CategoryId.create(randomUUID()),
    name: 'Food',
    bgColor: '#ffcfc9',
    textColor: '#b10202',
    displayOrder: 0,
    isArchived: args.archived ?? false,
  });
}

function makeMethod(args: { archived?: boolean } = {}): Method {
  return Method.create({
    id: MethodId.create(randomUUID()),
    name: 'Cash',
    bgColor: '#e8eaed',
    textColor: '#000000',
    displayOrder: 0,
    isArchived: args.archived ?? false,
  });
}

function makeStatus(args: { archived?: boolean } = {}): ReimbursementStatus {
  return ReimbursementStatus.create({
    id: ReimbursementStatusId.create(randomUUID()),
    name: 'Non-Reimbursable',
    bgColor: '#e8eaed',
    textColor: '#000000',
    displayOrder: 0,
    isArchived: args.archived ?? false,
  });
}

interface Harness {
  categories: FakeCategoryRepo;
  methods: FakeMethodRepo;
  statuses: FakeStatusRepo;
  expenses: FakeExpenseRepo;
  references: ReferenceValidator;
  bus: InMemoryEventBus;
  events: DomainEvent[];
  category: Category;
  method: Method;
  status: ReimbursementStatus;
  clock: () => Date;
  nowAt(iso: string): void;
}

function makeHarness(): Harness {
  const categories = new FakeCategoryRepo();
  const methods = new FakeMethodRepo();
  const statuses = new FakeStatusRepo();
  const expenses = new FakeExpenseRepo();
  const references = new ReferenceValidator(
    new CategoryLookup(categories),
    new MethodLookup(methods),
    new ReimbursementStatusLookup(statuses),
  );
  const bus = new InMemoryEventBus();
  const events: DomainEvent[] = [];
  for (const type of [ExpenseRecorded.type, ExpenseEdited.type, ExpenseDeleted.type]) {
    bus.subscribe(type, (event) => {
      events.push(event);
    });
  }
  const category = makeCategory();
  const method = makeMethod();
  const status = makeStatus();
  categories.seed(category);
  methods.seed(method);
  statuses.seed(status);

  let currentNow = new Date('2026-05-16T12:00:00.000Z');
  return {
    categories,
    methods,
    statuses,
    expenses,
    references,
    bus,
    events,
    category,
    method,
    status,
    clock: () => currentNow,
    nowAt(iso: string): void {
      currentNow = new Date(iso);
    },
  };
}

async function recordOne(h: Harness, overrides: Partial<Parameters<RecordExpense['execute']>[0]> = {}) {
  const result = await new RecordExpense(h.expenses, h.references, h.bus, h.clock).execute({
    transactionDate: new Date('2026-05-16T00:00:00.000Z'),
    amountInput: '100000',
    description: 'Lunch',
    categoryId: h.category.id,
    methodId: h.method.id,
    reimbursementStatusId: h.status.id,
    ...overrides,
  });
  if (!result.ok) throw new Error(`recordOne failed: ${result.error.code}`);
  return result.value;
}

describe('RecordExpense', () => {
  let h: Harness;
  beforeEach(() => {
    h = makeHarness();
  });

  it('records a plain-number expense with rawInput=null', async () => {
    const result = await new RecordExpense(h.expenses, h.references, h.bus, h.clock).execute({
      transactionDate: new Date('2026-05-16T00:00:00.000Z'),
      amountInput: '100000',
      description: 'Lunch',
      categoryId: h.category.id,
      methodId: h.method.id,
      reimbursementStatusId: h.status.id,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.amount.equals(Money.fromMinor(100_000n, 'IDR'))).toBe(true);
    expect(result.value.rawInput).toBeNull();
    expect(h.expenses.rows.size).toBe(1);
    expect(h.events).toHaveLength(1);
    expect(h.events[0]).toBeInstanceOf(ExpenseRecorded);
    expect((h.events[0]!.payload as { amountMinor: string }).amountMinor).toBe('100000');
  });

  it('records a formula and preserves the rawInput verbatim', async () => {
    const result = await new RecordExpense(h.expenses, h.references, h.bus, h.clock).execute({
      transactionDate: new Date('2026-05-16T00:00:00.000Z'),
      amountInput: '=20000*5',
      description: 'Lunch',
      categoryId: h.category.id,
      methodId: h.method.id,
      reimbursementStatusId: h.status.id,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.amount.equals(Money.fromMinor(100_000n, 'IDR'))).toBe(true);
    expect(result.value.rawInput).toBe('=20000*5');
  });

  it('records bare arithmetic without leading `=` and keeps rawInput', async () => {
    const result = await new RecordExpense(h.expenses, h.references, h.bus, h.clock).execute({
      transactionDate: new Date('2026-05-16T00:00:00.000Z'),
      amountInput: '99000-81000',
      description: 'Refund',
      categoryId: h.category.id,
      methodId: h.method.id,
      reimbursementStatusId: h.status.id,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.amount.equals(Money.fromMinor(18_000n, 'IDR'))).toBe(true);
    expect(result.value.rawInput).toBe('99000-81000');
  });

  it('rejects zero result from formula', async () => {
    const result = await new RecordExpense(h.expenses, h.references, h.bus, h.clock).execute({
      transactionDate: new Date('2026-05-16T00:00:00.000Z'),
      amountInput: '100-100',
      description: 'Refund',
      categoryId: h.category.id,
      methodId: h.method.id,
      reimbursementStatusId: h.status.id,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(InvalidExpenseAmountError);
    expect(h.expenses.rows.size).toBe(0);
    expect(h.events).toHaveLength(0);
  });

  it('rejects negative result from formula', async () => {
    const result = await new RecordExpense(h.expenses, h.references, h.bus, h.clock).execute({
      transactionDate: new Date('2026-05-16T00:00:00.000Z'),
      amountInput: '100-200',
      description: 'Refund',
      categoryId: h.category.id,
      methodId: h.method.id,
      reimbursementStatusId: h.status.id,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(InvalidExpenseAmountError);
  });

  it('rejects an empty description', async () => {
    const result = await new RecordExpense(h.expenses, h.references, h.bus, h.clock).execute({
      transactionDate: new Date('2026-05-16T00:00:00.000Z'),
      amountInput: '100',
      description: '   ',
      categoryId: h.category.id,
      methodId: h.method.id,
      reimbursementStatusId: h.status.id,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(InvalidExpenseDescriptionError);
  });

  it('rejects an archived category', async () => {
    const archived = makeCategory({ archived: true });
    h.categories.seed(archived);
    const result = await new RecordExpense(h.expenses, h.references, h.bus, h.clock).execute({
      transactionDate: new Date('2026-05-16T00:00:00.000Z'),
      amountInput: '100',
      description: 'Lunch',
      categoryId: archived.id,
      methodId: h.method.id,
      reimbursementStatusId: h.status.id,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(ReferenceNotFoundError);
    expect((result.error as ReferenceNotFoundError).field).toBe('categoryId');
  });

  it('rejects a missing method', async () => {
    const result = await new RecordExpense(h.expenses, h.references, h.bus, h.clock).execute({
      transactionDate: new Date('2026-05-16T00:00:00.000Z'),
      amountInput: '100',
      description: 'Lunch',
      categoryId: h.category.id,
      methodId: '00000000-0000-4000-8000-000000000000',
      reimbursementStatusId: h.status.id,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(ReferenceNotFoundError);
    expect((result.error as ReferenceNotFoundError).field).toBe('methodId');
  });

  it('rejects malformed reference uuids', async () => {
    const result = await new RecordExpense(h.expenses, h.references, h.bus, h.clock).execute({
      transactionDate: new Date('2026-05-16T00:00:00.000Z'),
      amountInput: '100',
      description: 'Lunch',
      categoryId: 'not-a-uuid',
      methodId: h.method.id,
      reimbursementStatusId: h.status.id,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(ReferenceNotFoundError);
  });
});

describe('EditExpense', () => {
  let h: Harness;
  beforeEach(() => {
    h = makeHarness();
  });

  it('returns NotFound for a missing expense', async () => {
    const result = await new EditExpense(h.expenses, h.references, h.bus, h.clock).execute({
      id: randomUUID(),
      description: 'X',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(ExpenseNotFoundError);
  });

  it('returns InvalidExpenseId for a malformed id', async () => {
    const result = await new EditExpense(h.expenses, h.references, h.bus, h.clock).execute({
      id: 'not-a-uuid',
      description: 'X',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(InvalidExpenseIdError);
  });

  it('updates description and emits an edited event with the diff', async () => {
    const recorded = await recordOne(h);
    h.events.length = 0;
    h.nowAt('2026-05-17T08:00:00.000Z');

    const result = await new EditExpense(h.expenses, h.references, h.bus, h.clock).execute({
      id: recorded.id,
      description: 'Lunch with team',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.description).toBe('Lunch with team');
    expect(result.value.updatedAt.toISOString()).toBe('2026-05-17T08:00:00.000Z');
    expect(h.events).toHaveLength(1);
    const payload = h.events[0]!.payload as {
      expenseId: string;
      changes: { description?: string; amount?: unknown };
    };
    expect(payload.changes.description).toBe('Lunch with team');
    expect(payload.changes.amount).toBeUndefined();
  });

  it('updates amount and rawInput together, includes both in the edited event', async () => {
    const recorded = await recordOne(h);
    h.events.length = 0;

    const result = await new EditExpense(h.expenses, h.references, h.bus, h.clock).execute({
      id: recorded.id,
      amountInput: '=50*1000',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.amount.equals(Money.fromMinor(50_000n, 'IDR'))).toBe(true);
    expect(result.value.rawInput).toBe('=50*1000');
    expect(h.events).toHaveLength(1);
    const changes = (h.events[0]!.payload as { changes: { amount?: { amountMinor: string; rawInput: string | null } } })
      .changes;
    expect(changes.amount?.amountMinor).toBe('50000');
    expect(changes.amount?.rawInput).toBe('=50*1000');
  });

  it('rejects archived category on reassignment', async () => {
    const recorded = await recordOne(h);
    const archived = makeCategory({ archived: true });
    h.categories.seed(archived);

    const result = await new EditExpense(h.expenses, h.references, h.bus, h.clock).execute({
      id: recorded.id,
      categoryId: archived.id,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(ReferenceNotFoundError);
    expect((result.error as ReferenceNotFoundError).field).toBe('categoryId');
  });

  it('emits no event when nothing actually changes', async () => {
    const recorded = await recordOne(h);
    h.events.length = 0;

    const result = await new EditExpense(h.expenses, h.references, h.bus, h.clock).execute({
      id: recorded.id,
      description: recorded.description,
    });
    expect(result.ok).toBe(true);
    expect(h.events).toHaveLength(0);
  });
});

describe('DeleteExpense', () => {
  let h: Harness;
  beforeEach(() => {
    h = makeHarness();
  });

  it('deletes an existing expense and emits an event', async () => {
    const recorded = await recordOne(h);
    h.events.length = 0;

    const result = await new DeleteExpense(h.expenses, h.bus, h.clock).execute({
      id: recorded.id,
    });
    expect(result.ok).toBe(true);
    expect(h.expenses.rows.size).toBe(0);
    expect(h.events).toHaveLength(1);
    expect(h.events[0]).toBeInstanceOf(ExpenseDeleted);
    expect((h.events[0]!.payload as { expenseId: string }).expenseId).toBe(recorded.id);
  });

  it('returns NotFound for a missing expense', async () => {
    const result = await new DeleteExpense(h.expenses, h.bus, h.clock).execute({
      id: randomUUID(),
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(ExpenseNotFoundError);
    expect(h.events).toHaveLength(0);
  });

  it('returns InvalidExpenseId for a malformed id', async () => {
    const result = await new DeleteExpense(h.expenses, h.bus, h.clock).execute({
      id: 'not-a-uuid',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(InvalidExpenseIdError);
  });
});

describe('GetExpense', () => {
  let h: Harness;
  beforeEach(() => {
    h = makeHarness();
  });

  it('returns the expense by id', async () => {
    const recorded = await recordOne(h);
    const result = await new GetExpense(h.expenses).execute({ id: recorded.id });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.id).toBe(recorded.id);
  });

  it('returns NotFound when missing', async () => {
    const result = await new GetExpense(h.expenses).execute({ id: randomUUID() });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(ExpenseNotFoundError);
  });
});

describe('ListExpenses', () => {
  let h: Harness;
  beforeEach(() => {
    h = makeHarness();
  });

  it('returns paginated results with total', async () => {
    for (let i = 0; i < 5; i++) {
      h.nowAt(`2026-05-${String(10 + i).padStart(2, '0')}T00:00:00.000Z`);
      await recordOne(h, {
        transactionDate: new Date(`2026-05-${String(10 + i).padStart(2, '0')}T00:00:00.000Z`),
        description: `Item ${i}`,
      });
    }
    const result = await new ListExpenses(h.expenses).execute({ limit: 2, offset: 0 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.total).toBe(5);
    expect(result.value.items).toHaveLength(2);
    expect(result.value.limit).toBe(2);
    expect(result.value.offset).toBe(0);
  });

  it('filters by description query (case-insensitive substring)', async () => {
    await recordOne(h, { description: 'Lunch with Alex' });
    await recordOne(h, { description: 'Bus fare' });
    await recordOne(h, { description: 'Dinner with team' });

    const result = await new ListExpenses(h.expenses).execute({ descriptionQuery: 'WITH' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.total).toBe(2);
  });

  it('filters by date range (half-open)', async () => {
    await recordOne(h, { transactionDate: new Date('2026-05-10T00:00:00.000Z') });
    await recordOne(h, { transactionDate: new Date('2026-05-15T00:00:00.000Z') });
    await recordOne(h, { transactionDate: new Date('2026-05-20T00:00:00.000Z') });

    const result = await new ListExpenses(h.expenses).execute({
      dateStart: new Date('2026-05-10T00:00:00.000Z'),
      dateEnd: new Date('2026-05-20T00:00:00.000Z'),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.total).toBe(2);
  });

  it('rejects limit out of range', async () => {
    const result = await new ListExpenses(h.expenses).execute({ limit: 0 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(InvalidPaginationError);
  });

  it('rejects offset that is negative', async () => {
    const result = await new ListExpenses(h.expenses).execute({ offset: -1 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(InvalidPaginationError);
  });

  it('rejects malformed filter ids without hitting the repo', async () => {
    const result = await new ListExpenses(h.expenses).execute({ categoryId: 'not-a-uuid' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(ReferenceNotFoundError);
  });
});

describe('ReferenceValidator', () => {
  it('accepts the active triple', async () => {
    const h = makeHarness();
    const result = await h.references.assertActive({
      categoryId: h.category.id,
      methodId: h.method.id,
      reimbursementStatusId: h.status.id,
    });
    expect(result.ok).toBe(true);
  });

  it('rejects when category is archived', async () => {
    const h = makeHarness();
    h.category.archive();
    await h.categories.save(h.category);
    const result = await h.references.assertActive({
      categoryId: h.category.id,
      methodId: h.method.id,
      reimbursementStatusId: h.status.id,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.field).toBe('categoryId');
  });

  it('rejects missing method', async () => {
    const h = makeHarness();
    const result = await h.references.assertActive({
      categoryId: h.category.id,
      methodId: randomUUID(),
      reimbursementStatusId: h.status.id,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.field).toBe('methodId');
  });

  it('single-field variant rejects archived status', async () => {
    const h = makeHarness();
    h.status.archive();
    await h.statuses.save(h.status);
    const result = await h.references.assertOneActive('reimbursementStatusId', h.status.id);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.field).toBe('reimbursementStatusId');
  });
});
