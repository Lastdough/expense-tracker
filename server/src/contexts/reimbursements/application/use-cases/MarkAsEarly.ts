import { type EventBus } from '../../../../shared-kernel/domain-events/EventBus.js';
import { err, ok, type Result } from '../../../../shared-kernel/result/Result.js';
import { type Reimbursement } from '../../domain/entities/Reimbursement.js';
import {
  IllegalTransitionError,
  InvalidReimbursementDateError,
  InvalidReimbursementIdError,
  ReimbursementNotFoundError,
} from '../../domain/errors/ReimbursementErrors.js';
import { ReimbursementMarkedAsEarly } from '../../domain/events/ReimbursementMarkedAsEarly.js';
import { type IReimbursementRepository } from '../../domain/repositories/IReimbursementRepository.js';
import { ReimbursementId } from '../../domain/value-objects/ReimbursementId.js';

export interface MarkAsEarlyInput {
  readonly id: string;
  readonly receivedAt: Date;
}

export type MarkAsEarlyError =
  | InvalidReimbursementIdError
  | ReimbursementNotFoundError
  | IllegalTransitionError
  | InvalidReimbursementDateError;

export class MarkAsEarly {
  constructor(
    private readonly reimbursements: IReimbursementRepository,
    private readonly eventBus: EventBus,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(input: MarkAsEarlyInput): Promise<Result<Reimbursement, MarkAsEarlyError>> {
    if (!ReimbursementId.isValid(input.id)) {
      return err(new InvalidReimbursementIdError(`Invalid reimbursement id "${input.id}"`));
    }
    const id = ReimbursementId.create(input.id);
    const reimbursement = await this.reimbursements.findById(id);
    if (!reimbursement) {
      return err(new ReimbursementNotFoundError(`Reimbursement ${input.id} not found`));
    }
    const now = this.clock();
    const tx = reimbursement.markAsEarly(input.receivedAt, now);
    if (!tx.ok) return tx;
    await this.reimbursements.save(reimbursement);
    this.eventBus.publish(
      new ReimbursementMarkedAsEarly(
        {
          reimbursementId: reimbursement.id,
          expenseId: reimbursement.expenseId,
          receivedAt: input.receivedAt.toISOString(),
        },
        now,
      ),
    );
    return ok(reimbursement);
  }
}
