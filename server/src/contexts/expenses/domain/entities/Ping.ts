import { type PingId } from '../value-objects/PingId.js';

// Throwaway placeholder for Milestone C. The real expenses domain (Expense
// aggregate, etc.) arrives in Milestone F and replaces this.
export class Ping {
  private constructor(
    public readonly id: PingId,
    public readonly message: string,
    public readonly recordedAt: Date,
  ) {}

  static create(args: { id: PingId; message: string; recordedAt: Date }): Ping {
    if (args.message.trim().length === 0) {
      throw new RangeError('Ping message must not be empty');
    }
    return new Ping(args.id, args.message, args.recordedAt);
  }
}
