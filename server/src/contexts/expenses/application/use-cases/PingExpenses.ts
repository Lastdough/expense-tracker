import { randomUUID } from 'node:crypto';
import { err, ok, type Result } from '../../../../shared-kernel/result/Result.js';
import { type DomainError } from '../../../../shared-kernel/errors/DomainError.js';
import { Ping } from '../../domain/entities/Ping.js';
import { PingId } from '../../domain/value-objects/PingId.js';
import { InvalidPingMessageError } from '../../domain/errors/PingErrors.js';
import { type IPingRepository } from '../../domain/repositories/IPingRepository.js';

export interface PingInput {
  readonly message: string;
}

// Smoke-test use case for Milestone C. Demonstrates the full pattern:
//   Controller -> UseCase -> Repository -> persistence.
// Deleted in Milestone F when the real Expense use cases land.
export class PingExpenses {
  constructor(private readonly pings: IPingRepository) {}

  async execute(input: PingInput): Promise<Result<Ping, DomainError>> {
    const trimmed = input.message.trim();
    if (trimmed.length === 0) {
      return err(new InvalidPingMessageError('message must not be empty'));
    }
    const ping = Ping.create({
      id: PingId.create(randomUUID()),
      message: trimmed,
      recordedAt: new Date(),
    });
    await this.pings.save(ping);
    return ok(ping);
  }
}
