import { Category } from '../../domain/entities/Category.js';
import { CategoryId } from '../../domain/value-objects/CategoryId.js';

// Local row shape — keeps this file Prisma-free. The repository imports
// @prisma/client; the mapper does not.
export interface CategoryRow {
  readonly id: string;
  readonly name: string;
  readonly nameNormalized: string;
  readonly bgColor: string;
  readonly textColor: string;
  readonly isArchived: boolean;
  readonly displayOrder: number;
}

export const CategoryMapper = {
  toDomain(row: CategoryRow): Category {
    return Category.create({
      id: CategoryId.create(row.id),
      name: row.name,
      bgColor: row.bgColor,
      textColor: row.textColor,
      displayOrder: row.displayOrder,
      isArchived: row.isArchived,
    });
  },
  toPersistence(category: Category): CategoryRow {
    return {
      id: category.id,
      name: category.name,
      nameNormalized: category.nameNormalized,
      bgColor: category.bgColor,
      textColor: category.textColor,
      isArchived: category.isArchived,
      displayOrder: category.displayOrder,
    };
  },
};
