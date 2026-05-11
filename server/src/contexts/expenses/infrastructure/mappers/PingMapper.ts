import { Ping } from '../../domain/entities/Ping.js';
import { PingId } from '../../domain/value-objects/PingId.js';

// Local row shape kept independent of @prisma/client so the mapper itself
// stays Prisma-free. The repository depends on Prisma; the mapper does not.
export interface PingRow {
  readonly id: string;
  readonly message: string;
  readonly recordedAt: Date;
}

export const PingMapper = {
  toDomain(row: PingRow): Ping {
    return Ping.create({
      id: PingId.create(row.id),
      message: row.message,
      recordedAt: row.recordedAt,
    });
  },
  toPersistence(ping: Ping): PingRow {
    return {
      id: ping.id,
      message: ping.message,
      recordedAt: ping.recordedAt,
    };
  },
};
