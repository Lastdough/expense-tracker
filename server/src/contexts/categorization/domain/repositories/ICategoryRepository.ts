import { type Category } from '../entities/Category.js';
import { type CategoryId } from '../value-objects/CategoryId.js';

export interface ICategoryRepository {
  save(category: Category): Promise<void>;
  saveMany(categories: readonly Category[]): Promise<void>;
  findById(id: CategoryId): Promise<Category | null>;
  findByNormalizedName(nameNormalized: string): Promise<Category | null>;
  /** All categories ordered by displayOrder ascending (archived included). */
  listAll(): Promise<Category[]>;
  /** Non-archived categories ordered by displayOrder ascending. */
  listActive(): Promise<Category[]>;
  /** Returns the next displayOrder to assign for a freshly-created category. */
  nextDisplayOrder(): Promise<number>;
}
