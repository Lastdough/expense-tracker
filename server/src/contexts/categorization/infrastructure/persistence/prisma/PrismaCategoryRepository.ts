import { type PrismaClient } from '@prisma/client';
import { type Category } from '../../../domain/entities/Category.js';
import { type CategoryId } from '../../../domain/value-objects/CategoryId.js';
import { type ICategoryRepository } from '../../../domain/repositories/ICategoryRepository.js';
import { CategoryMapper } from '../../mappers/CategoryMapper.js';

export class PrismaCategoryRepository implements ICategoryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(category: Category): Promise<void> {
    const row = CategoryMapper.toPersistence(category);
    await this.prisma.category.upsert({
      where: { id: row.id },
      create: row,
      update: {
        name: row.name,
        nameNormalized: row.nameNormalized,
        bgColor: row.bgColor,
        textColor: row.textColor,
        isArchived: row.isArchived,
        displayOrder: row.displayOrder,
      },
    });
  }

  async saveMany(categories: readonly Category[]): Promise<void> {
    if (categories.length === 0) return;
    await this.prisma.$transaction(
      categories.map((c) => {
        const row = CategoryMapper.toPersistence(c);
        return this.prisma.category.update({
          where: { id: row.id },
          data: {
            name: row.name,
            nameNormalized: row.nameNormalized,
            bgColor: row.bgColor,
            textColor: row.textColor,
            isArchived: row.isArchived,
            displayOrder: row.displayOrder,
          },
        });
      }),
    );
  }

  async findById(id: CategoryId): Promise<Category | null> {
    const row = await this.prisma.category.findUnique({ where: { id } });
    return row ? CategoryMapper.toDomain(row) : null;
  }

  async findByNormalizedName(nameNormalized: string): Promise<Category | null> {
    const row = await this.prisma.category.findUnique({ where: { nameNormalized } });
    return row ? CategoryMapper.toDomain(row) : null;
  }

  async listAll(): Promise<Category[]> {
    const rows = await this.prisma.category.findMany({ orderBy: { displayOrder: 'asc' } });
    return rows.map(CategoryMapper.toDomain);
  }

  async listActive(): Promise<Category[]> {
    const rows = await this.prisma.category.findMany({
      where: { isArchived: false },
      orderBy: { displayOrder: 'asc' },
    });
    return rows.map(CategoryMapper.toDomain);
  }

  async nextDisplayOrder(): Promise<number> {
    const agg = await this.prisma.category.aggregate({ _max: { displayOrder: true } });
    return agg._max.displayOrder === null ? 0 : agg._max.displayOrder + 1;
  }
}
