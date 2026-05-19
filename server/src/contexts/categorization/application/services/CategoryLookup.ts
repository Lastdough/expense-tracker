import { Category } from '../../domain/entities/Category.js';
import { type ICategoryRepository } from '../../domain/repositories/ICategoryRepository.js';
import { CategoryId } from '../../domain/value-objects/CategoryId.js';

export interface ReferenceOption {
  readonly id: string;
  readonly name: string;
}

/**
 * Application-layer lookup for cross-context consumers (e.g. the Expenses
 * context's `ReferenceValidator`). Returns booleans/DTOs rather than the
 * Category entity so callers don't take a domain-type dependency on this context.
 */
export class CategoryLookup {
  constructor(private readonly categories: ICategoryRepository) {}

  async isActiveById(rawId: string): Promise<boolean> {
    if (!CategoryId.isValid(rawId)) return false;
    const category = await this.categories.findById(CategoryId.create(rawId));
    return category !== null && !category.isArchived;
  }

  async findIdByName(name: string): Promise<string | null> {
    const normalized = Category.normalizeName(name);
    if (normalized.length === 0) return null;
    const category = await this.categories.findByNormalizedName(normalized);
    if (category === null || category.isArchived) return null;
    return category.id;
  }

  async listActiveOptions(): Promise<readonly ReferenceOption[]> {
    const list = await this.categories.listActive();
    return list.map((c) => ({ id: c.id, name: c.name }));
  }
}
