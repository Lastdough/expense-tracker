import { err, ok, type Result } from '../../../../shared-kernel/result/Result.js';
import { Category } from '../../domain/entities/Category.js';
import { CategoryId } from '../../domain/value-objects/CategoryId.js';
import {
  CategoryNotFoundError,
  DuplicateCategoryNameError,
} from '../../domain/errors/CategoryErrors.js';
import { type ICategoryRepository } from '../../domain/repositories/ICategoryRepository.js';

export interface RenameCategoryInput {
  readonly id: string;
  readonly newName: string;
}

export class RenameCategory {
  constructor(private readonly categories: ICategoryRepository) {}

  async execute(
    input: RenameCategoryInput,
  ): Promise<Result<Category, CategoryNotFoundError | DuplicateCategoryNameError>> {
    if (!CategoryId.isValid(input.id)) {
      return err(new CategoryNotFoundError(`Category ${input.id} not found`));
    }
    const category = await this.categories.findById(CategoryId.create(input.id));
    if (!category) {
      return err(new CategoryNotFoundError(`Category ${input.id} not found`));
    }

    const newNormalized = Category.normalizeName(input.newName);
    if (newNormalized !== category.nameNormalized) {
      const clash = await this.categories.findByNormalizedName(newNormalized);
      if (clash) {
        return err(new DuplicateCategoryNameError(`Category "${input.newName}" already exists`));
      }
    }

    category.rename(input.newName);
    await this.categories.save(category);
    return ok(category);
  }
}
