import { err, ok, type Result } from '../../../../shared-kernel/result/Result.js';
import { type Category } from '../../domain/entities/Category.js';
import { CategoryId } from '../../domain/value-objects/CategoryId.js';
import { CategoryNotFoundError } from '../../domain/errors/CategoryErrors.js';
import { type ICategoryRepository } from '../../domain/repositories/ICategoryRepository.js';

export interface UnarchiveCategoryInput {
  readonly id: string;
}

export class UnarchiveCategory {
  constructor(private readonly categories: ICategoryRepository) {}

  async execute(input: UnarchiveCategoryInput): Promise<Result<Category, CategoryNotFoundError>> {
    if (!CategoryId.isValid(input.id)) {
      return err(new CategoryNotFoundError(`Category ${input.id} not found`));
    }
    const category = await this.categories.findById(CategoryId.create(input.id));
    if (!category) {
      return err(new CategoryNotFoundError(`Category ${input.id} not found`));
    }
    category.unarchive();
    await this.categories.save(category);
    return ok(category);
  }
}
