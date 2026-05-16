import { type ICategoryRepository } from '../../domain/repositories/ICategoryRepository.js';
import { CategoryId } from '../../domain/value-objects/CategoryId.js';

/**
 * Application-layer lookup for cross-context consumers (e.g. the Expenses
 * context's `ReferenceValidator`). Returns a boolean rather than the Category
 * entity so callers don't take a domain-type dependency on this context.
 */
export class CategoryLookup {
  constructor(private readonly categories: ICategoryRepository) {}

  async isActiveById(rawId: string): Promise<boolean> {
    if (!CategoryId.isValid(rawId)) return false;
    const category = await this.categories.findById(CategoryId.create(rawId));
    return category !== null && !category.isArchived;
  }
}
