import { type PrismaClient } from '@prisma/client';
import { type Ping } from '../../../domain/entities/Ping.js';
import { type PingId } from '../../../domain/value-objects/PingId.js';
import { type IPingRepository } from '../../../domain/repositories/IPingRepository.js';
import { PingMapper } from '../../mappers/PingMapper.js';

export class PrismaPingRepository implements IPingRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(ping: Ping): Promise<void> {
    const row = PingMapper.toPersistence(ping);
    await this.prisma.ping.create({ data: row });
  }

  async findById(id: PingId): Promise<Ping | null> {
    const row = await this.prisma.ping.findUnique({ where: { id } });
    return row ? PingMapper.toDomain(row) : null;
  }

  async latest(): Promise<Ping | null> {
    const row = await this.prisma.ping.findFirst({ orderBy: { recordedAt: 'desc' } });
    return row ? PingMapper.toDomain(row) : null;
  }
}
