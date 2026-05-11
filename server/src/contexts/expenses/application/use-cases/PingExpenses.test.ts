import { describe, expect, it } from 'vitest';
import { PingExpenses } from './PingExpenses.js';
import { InvalidPingMessageError } from '../../domain/errors/PingErrors.js';
import { type Ping } from '../../domain/entities/Ping.js';
import { type PingId } from '../../domain/value-objects/PingId.js';
import { type IPingRepository } from '../../domain/repositories/IPingRepository.js';

class FakePingRepository implements IPingRepository {
  readonly stored: Ping[] = [];
  async save(ping: Ping): Promise<void> {
    this.stored.push(ping);
  }
  async findById(id: PingId): Promise<Ping | null> {
    return this.stored.find((p) => p.id === id) ?? null;
  }
  async latest(): Promise<Ping | null> {
    return this.stored.at(-1) ?? null;
  }
}

describe('PingExpenses', () => {
  it('persists a ping and returns it for a valid message', async () => {
    const repo = new FakePingRepository();
    const useCase = new PingExpenses(repo);

    const result = await useCase.execute({ message: 'hello' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.message).toBe('hello');
    expect(repo.stored).toHaveLength(1);
    expect(repo.stored[0]).toBe(result.value);
  });

  it('trims surrounding whitespace before persisting', async () => {
    const repo = new FakePingRepository();
    const useCase = new PingExpenses(repo);

    const result = await useCase.execute({ message: '   hi there   ' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.message).toBe('hi there');
  });

  it('returns InvalidPingMessageError for an empty message', async () => {
    const repo = new FakePingRepository();
    const useCase = new PingExpenses(repo);

    const result = await useCase.execute({ message: '   ' });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(InvalidPingMessageError);
    expect(result.error.code).toBe('invalid_ping_message');
    expect(repo.stored).toHaveLength(0);
  });

  it('generates a fresh id for each ping', async () => {
    const repo = new FakePingRepository();
    const useCase = new PingExpenses(repo);

    const a = await useCase.execute({ message: 'first' });
    const b = await useCase.execute({ message: 'second' });

    if (!a.ok || !b.ok) throw new Error('expected both pings to succeed');
    expect(a.value.id).not.toBe(b.value.id);
  });
});
