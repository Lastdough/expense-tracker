import { type Category } from '../../domain/entities/Category.js';
import { type ICategoryRepository } from '../../domain/repositories/ICategoryRepository.js';

export interface ListCategoriesInput {
  readonly includeArchived: boolean;
}

export class ListCategories {
  constructor(private readonly categories: ICategoryRepository) {}

  async execute(input: ListCategoriesInput): Promise<Category[]> {
    return input.includeArchived ? this.categories.listAll() : this.categories.listActive();
  }
}
