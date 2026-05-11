import { type PrismaClient } from '@prisma/client';
import { type Method } from '../../../domain/entities/Method.js';
import { type MethodId } from '../../../domain/value-objects/MethodId.js';
import { type IMethodRepository } from '../../../domain/repositories/IMethodRepository.js';
import { MethodMapper } from '../../mappers/MethodMapper.js';

export class PrismaMethodRepository implements IMethodRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(method: Method): Promise<void> {
    const row = MethodMapper.toPersistence(method);
    await this.prisma.method.upsert({
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

  async saveMany(methods: readonly Method[]): Promise<void> {
    if (methods.length === 0) return;
    await this.prisma.$transaction(
      methods.map((m) => {
        const row = MethodMapper.toPersistence(m);
        return this.prisma.method.update({
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

  async findById(id: MethodId): Promise<Method | null> {
    const row = await this.prisma.method.findUnique({ where: { id } });
    return row ? MethodMapper.toDomain(row) : null;
  }

  async findByNormalizedName(nameNormalized: string): Promise<Method | null> {
    const row = await this.prisma.method.findUnique({ where: { nameNormalized } });
    return row ? MethodMapper.toDomain(row) : null;
  }

  async listAll(): Promise<Method[]> {
    const rows = await this.prisma.method.findMany({ orderBy: { displayOrder: 'asc' } });
    return rows.map(MethodMapper.toDomain);
  }

  async listActive(): Promise<Method[]> {
    const rows = await this.prisma.method.findMany({
      where: { isArchived: false },
      orderBy: { displayOrder: 'asc' },
    });
    return rows.map(MethodMapper.toDomain);
  }

  async nextDisplayOrder(): Promise<number> {
    const agg = await this.prisma.method.aggregate({ _max: { displayOrder: true } });
    return agg._max.displayOrder === null ? 0 : agg._max.displayOrder + 1;
  }
}
