import { type Ping } from '../../domain/entities/Ping.js';
import { type IPingRepository } from '../../domain/repositories/IPingRepository.js';

// Companion query for PingExpenses. Read-only: returns the most recently
// recorded Ping, or null if none have been recorded yet.
export class GetLatestPing {
  constructor(private readonly pings: IPingRepository) {}

  async execute(): Promise<Ping | null> {
    return this.pings.latest();
  }
}
