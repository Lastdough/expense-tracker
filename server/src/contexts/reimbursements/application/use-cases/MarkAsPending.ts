import { type EventBus } from '../../../../shared-kernel/domain-events/EventBus.js';
import { err, ok, type Result } from '../../../../shared-kernel/result/Result.js';
import { type Reimbursement } from '../../domain/entities/Reimbursement.js';
import {
  IllegalTransitionError,
  InvalidReimbursementIdError,
  ReimbursementNotFoundError,
} from '../../domain/errors/ReimbursementErrors.js';
import { ReimbursementMarkedAsPending } from '../../domain/events/ReimbursementMarkedAsPending.js';
import { type IReimbursementRepository } from '../../domain/repositories/IReimbursementRepository.js';
import { ReimbursementId } from '../../domain/value-objects/ReimbursementId.js';

export interface MarkAsPendingInput {
  readonly id: string;
}

export type MarkAsPendingError =
  | InvalidReimbursementIdError
  | ReimbursementNotFoundError
  | IllegalTransitionError;

export class MarkAsPending {
  constructor(
    private readonly reimbursements: IReimbursementRepository,
    private readonly eventBus: EventBus,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(input: MarkAsPendingInput): Promise<Result<Reimbursement, MarkAsPendingError>> {
    if (!ReimbursementId.isValid(input.id)) {
      return err(new InvalidReimbursementIdError(`Invalid reimbursement id "${input.id}"`));
    }
    const id = ReimbursementId.create(input.id);
    const reimbursement = await this.reimbursements.findById(id);
    if (!reimbursement) {
      return err(new ReimbursementNotFoundError(`Reimbursement ${input.id} not found`));
    }
    const now = this.clock();
    const tx = reimbursement.markAsPending(now);
    if (!tx.ok) return tx;
    await this.reimbursements.save(reimbursement);
    this.eventBus.publish(
      new ReimbursementMarkedAsPending(
        { reimbursementId: reimbursement.id, expenseId: reimbursement.expenseId },
        now,
      ),
    );
    return ok(reimbursement);
  }
}
