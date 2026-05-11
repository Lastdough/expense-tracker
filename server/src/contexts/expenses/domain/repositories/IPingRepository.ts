import { type Ping } from '../entities/Ping.js';
import { type PingId } from '../value-objects/PingId.js';

export interface IPingRepository {
  save(ping: Ping): Promise<void>;
  findById(id: PingId): Promise<Ping | null>;
  latest(): Promise<Ping | null>;
}
