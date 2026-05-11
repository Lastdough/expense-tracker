import { beforeEach, describe, expect, it } from 'vitest';
import { Category } from '../../domain/entities/Category.js';
import { CategoryId } from '../../domain/value-objects/CategoryId.js';
import { type ICategoryRepository } from '../../domain/repositories/ICategoryRepository.js';
import {
  CategoryNotFoundError,
  CategoryReorderMismatchError,
  DuplicateCategoryNameError,
} from '../../domain/errors/CategoryErrors.js';
import { CreateCategory } from './CreateCategory.js';
import { RenameCategory } from './RenameCategory.js';
import { ChangeCategoryColors } from './ChangeCategoryColors.js';
import { ArchiveCategory } from './ArchiveCategory.js';
import { UnarchiveCategory } from './UnarchiveCategory.js';
import { ReorderCategories } from './ReorderCategories.js';
import { ListCategories } from './ListCategories.js';

class FakeCategoryRepository implements ICategoryRepository {
  readonly rows = new Map<CategoryId, Category>();

  async save(category: Category): Promise<void> {
    this.rows.set(category.id, category);
  }
  async saveMany(categories: readonly Category[]): Promise<void> {
    for (const c of categories) this.rows.set(c.id, c);
  }
  async findById(id: CategoryId): Promise<Category | null> {
    return this.rows.get(id) ?? null;
  }
  async findByNormalizedName(nameNormalized: string): Promise<Category | null> {
    for (const c of this.rows.values()) if (c.nameNormalized === nameNormalized) return c;
    return null;
  }
  async listAll(): Promise<Category[]> {
    return [...this.rows.values()].sort((a, b) => a.displayOrder - b.displayOrder);
  }
  async listActive(): Promise<Category[]> {
    return (await this.listAll()).filter((c) => !c.isArchived);
  }
  async nextDisplayOrder(): Promise<number> {
    return this.rows.size;
  }

  seed(category: Category): this {
    this.rows.set(category.id, category);
    return this;
  }
}

function makeCategory(args: { name: string; displayOrder?: number; isArchived?: boolean }): Category {
  return Category.create({
    id: CategoryId.create(crypto.randomUUID()),
    name: args.name,
    bgColor: '#ffcfc9',
    textColor: '#b10202',
    displayOrder: args.displayOrder ?? 0,
    isArchived: args.isArchived ?? false,
  });
}

describe('CreateCategory', () => {
  let repo: FakeCategoryRepository;
  beforeEach(() => {
    repo = new FakeCategoryRepository();
  });

  it('creates a category and assigns nextDisplayOrder', async () => {
    repo.seed(makeCategory({ name: 'Food', displayOrder: 0 }));
    const result = await new CreateCategory(repo).execute({
      name: 'Groceries',
      bgColor: '#e6cff2',
      textColor: '#5a3286',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.name).toBe('Groceries');
    expect(result.value.displayOrder).toBe(1);
    expect(repo.rows.size).toBe(2);
  });

  it('rejects duplicate names case-insensitively', async () => {
    repo.seed(makeCategory({ name: 'Food' }));
    const result = await new CreateCategory(repo).execute({
      name: '  FOOD ',
      bgColor: '#ffffff',
      textColor: '#000000',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(DuplicateCategoryNameError);
  });
});

describe('RenameCategory', () => {
  let repo: FakeCategoryRepository;
  beforeEach(() => {
    repo = new FakeCategoryRepository();
  });

  it('renames an existing category', async () => {
    const food = makeCategory({ name: 'Food' });
    repo.seed(food);
    const result = await new RenameCategory(repo).execute({ id: food.id, newName: 'Snacks' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.name).toBe('Snacks');
    expect(repo.rows.get(food.id)?.name).toBe('Snacks');
  });

  it('returns NotFound when id does not exist', async () => {
    const result = await new RenameCategory(repo).execute({
      id: CategoryId.create('00000000-0000-4000-8000-00000000ffff'),
      newName: 'X',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(CategoryNotFoundError);
  });

  it('allows renaming to the same normalized name (just different casing)', async () => {
    const food = makeCategory({ name: 'Food' });
    repo.seed(food);
    const result = await new RenameCategory(repo).execute({ id: food.id, newName: 'FOOD' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.name).toBe('FOOD');
  });

  it('rejects rename that would collide with another category', async () => {
    const food = makeCategory({ name: 'Food' });
    const grocery = makeCategory({ name: 'Groceries' });
    repo.seed(food).seed(grocery);
    const result = await new RenameCategory(repo).execute({
      id: grocery.id,
      newName: 'food',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(DuplicateCategoryNameError);
  });
});

describe('ChangeCategoryColors', () => {
  it('updates colors on an existing category', async () => {
    const repo = new FakeCategoryRepository();
    const c = makeCategory({ name: 'Food' });
    repo.seed(c);
    const result = await new ChangeCategoryColors(repo).execute({
      id: c.id,
      bgColor: '#000000',
      textColor: '#ffffff',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.bgColor).toBe('#000000');
    expect(result.value.textColor).toBe('#ffffff');
  });

  it('returns NotFound for missing id', async () => {
    const repo = new FakeCategoryRepository();
    const result = await new ChangeCategoryColors(repo).execute({
      id: CategoryId.create('00000000-0000-4000-8000-00000000ffff'),
      bgColor: '#000000',
      textColor: '#ffffff',
    });
    expect(result.ok).toBe(false);
  });
});

describe('Archive / Unarchive', () => {
  it('archives an existing category', async () => {
    const repo = new FakeCategoryRepository();
    const c = makeCategory({ name: 'Food' });
    repo.seed(c);
    const result = await new ArchiveCategory(repo).execute({ id: c.id });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.isArchived).toBe(true);
  });

  it('unarchives an archived category', async () => {
    const repo = new FakeCategoryRepository();
    const c = makeCategory({ name: 'Food', isArchived: true });
    repo.seed(c);
    const result = await new UnarchiveCategory(repo).execute({ id: c.id });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.isArchived).toBe(false);
  });
});

describe('ReorderCategories', () => {
  let repo: FakeCategoryRepository;
  let a: Category, b: Category, c: Category;
  beforeEach(() => {
    repo = new FakeCategoryRepository();
    a = makeCategory({ name: 'Food', displayOrder: 0 });
    b = makeCategory({ name: 'Groceries', displayOrder: 1 });
    c = makeCategory({ name: 'Shopping', displayOrder: 2 });
    repo.seed(a).seed(b).seed(c);
  });

  it('reorders all active categories', async () => {
    const result = await new ReorderCategories(repo).execute({ ids: [c.id, a.id, b.id] });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(repo.rows.get(c.id)?.displayOrder).toBe(0);
    expect(repo.rows.get(a.id)?.displayOrder).toBe(1);
    expect(repo.rows.get(b.id)?.displayOrder).toBe(2);
  });

  it('rejects when ids list is missing an active category', async () => {
    const result = await new ReorderCategories(repo).execute({ ids: [a.id, b.id] });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(CategoryReorderMismatchError);
  });

  it('rejects when ids list has duplicates', async () => {
    const result = await new ReorderCategories(repo).execute({
      ids: [a.id, a.id, b.id],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(CategoryReorderMismatchError);
  });

  it('rejects when the list references an archived id', async () => {
    a.archive();
    const result = await new ReorderCategories(repo).execute({ ids: [a.id, b.id, c.id] });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(CategoryReorderMismatchError);
  });
});

describe('ListCategories', () => {
  it('lists active only by default', async () => {
    const repo = new FakeCategoryRepository();
    const active = makeCategory({ name: 'Food', displayOrder: 0 });
    const archived = makeCategory({ name: 'Old', displayOrder: 1, isArchived: true });
    repo.seed(active).seed(archived);

    const onlyActive = await new ListCategories(repo).execute({ includeArchived: false });
    expect(onlyActive).toHaveLength(1);
    expect(onlyActive[0]?.id).toBe(active.id);

    const all = await new ListCategories(repo).execute({ includeArchived: true });
    expect(all).toHaveLength(2);
  });
});
