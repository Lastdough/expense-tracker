import { randomUUID } from 'node:crypto';
import { err, ok, type Result } from '../../../../shared-kernel/result/Result.js';
import { Category } from '../../domain/entities/Category.js';
import { CategoryId } from '../../domain/value-objects/CategoryId.js';
import { DuplicateCategoryNameError } from '../../domain/errors/CategoryErrors.js';
import { type ICategoryRepository } from '../../domain/repositories/ICategoryRepository.js';

export interface CreateCategoryInput {
  readonly name: string;
  readonly bgColor: string;
  readonly textColor: string;
}

export class CreateCategory {
  constructor(private readonly categories: ICategoryRepository) {}

  async execute(input: CreateCategoryInput): Promise<Result<Category, DuplicateCategoryNameError>> {
    const nameNormalized = Category.normalizeName(input.name);
    const existing = await this.categories.findByNormalizedName(nameNormalized);
    if (existing) {
      return err(new DuplicateCategoryNameError(`Category "${input.name}" already exists`));
    }

    const displayOrder = await this.categories.nextDisplayOrder();
    const category = Category.create({
      id: CategoryId.create(randomUUID()),
      name: input.name,
      bgColor: input.bgColor,
      textColor: input.textColor,
      displayOrder,
    });
    await this.categories.save(category);
    return ok(category);
  }
}
