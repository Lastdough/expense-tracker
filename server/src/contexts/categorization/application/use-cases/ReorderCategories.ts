import { err, ok, type Result } from '../../../../shared-kernel/result/Result.js';
import { type Category } from '../../domain/entities/Category.js';
import { CategoryId } from '../../domain/value-objects/CategoryId.js';
import {
  CategoryNotFoundError,
  CategoryReorderMismatchError,
} from '../../domain/errors/CategoryErrors.js';
import { type ICategoryRepository } from '../../domain/repositories/ICategoryRepository.js';

export interface ReorderCategoriesInput {
  readonly ids: readonly string[];
}

/**
 * Reorders non-archived categories. The input must be exactly the set of
 * currently non-archived category ids — no extras, no missing, no duplicates.
 * Archived categories keep their existing displayOrder.
 */
export class ReorderCategories {
  constructor(private readonly categories: ICategoryRepository) {}

  async execute(
    input: ReorderCategoriesInput,
  ): Promise<Result<Category[], CategoryNotFoundError | CategoryReorderMismatchError>> {
    if (new Set(input.ids).size !== input.ids.length) {
      return err(new CategoryReorderMismatchError('Reorder list contains duplicate ids'));
    }

    for (const raw of input.ids) {
      if (!CategoryId.isValid(raw)) {
        return err(new CategoryReorderMismatchError(`"${raw}" is not a valid category id`));
      }
    }
    const brandedIds = input.ids.map((raw) => CategoryId.create(raw));

    const active = await this.categories.listActive();
    const activeIds = new Set(active.map((c) => c.id as string));

    if (brandedIds.length !== activeIds.size) {
      return err(
        new CategoryReorderMismatchError(
          `Reorder list must contain exactly the ${activeIds.size} active categories; got ${brandedIds.length}`,
        ),
      );
    }

    for (const id of brandedIds) {
      if (!activeIds.has(id)) {
        return err(new CategoryNotFoundError(`Category ${id} is not active or does not exist`));
      }
    }

    const byId = new Map(active.map((c) => [c.id as string, c] as const));
    const reordered: Category[] = [];
    brandedIds.forEach((id, index) => {
      const category = byId.get(id);
      if (!category) return; // unreachable — we just validated membership
      category.reorderTo(index);
      reordered.push(category);
    });

    await this.categories.saveMany(reordered);
    return ok(reordered);
  }
}
