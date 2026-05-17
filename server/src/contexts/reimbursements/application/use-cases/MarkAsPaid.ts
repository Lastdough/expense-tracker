import { type EventBus } from '../../../../shared-kernel/domain-events/EventBus.js';
import { err, ok, type Result } from '../../../../shared-kernel/result/Result.js';
import { type Reimbursement } from '../../domain/entities/Reimbursement.js';
import {
  IllegalTransitionError,
  InvalidReimbursementDateError,
  InvalidReimbursementIdError,
  ReimbursementNotFoundError,
} from '../../domain/errors/ReimbursementErrors.js';
import { ReimbursementMarkedAsPaid } from '../../domain/events/ReimbursementMarkedAsPaid.js';
import { type IReimbursementRepository } from '../../domain/repositories/IReimbursementRepository.js';
import { ReimbursementId } from '../../domain/value-objects/ReimbursementId.js';

export interface MarkAsPaidInput {
  readonly id: string;
  readonly paidAt: Date;
}

export type MarkAsPaidError =
  | InvalidReimbursementIdError
  | ReimbursementNotFoundError
  | IllegalTransitionError
  | InvalidReimbursementDateError;

export class MarkAsPaid {
  constructor(
    private readonly reimbursements: IReimbursementRepository,
    private readonly eventBus: EventBus,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(input: MarkAsPaidInput): Promise<Result<Reimbursement, MarkAsPaidError>> {
    if (!ReimbursementId.isValid(input.id)) {
      return err(new InvalidReimbursementIdError(`Invalid reimbursement id "${input.id}"`));
    }
    const id = ReimbursementId.create(input.id);
    const reimbursement = await this.reimbursements.findById(id);
    if (!reimbursement) {
      return err(new ReimbursementNotFoundError(`Reimbursement ${input.id} not found`));
    }
    const now = this.clock();
    const tx = reimbursement.markAsPaid(input.paidAt, now);
    if (!tx.ok) return tx;
    await this.reimbursements.save(reimbursement);
    this.eventBus.publish(
      new ReimbursementMarkedAsPaid(
        {
          reimbursementId: reimbursement.id,
          expenseId: reimbursement.expenseId,
          paidAt: input.paidAt.toISOString(),
        },
        now,
      ),
    );
    return ok(reimbursement);
  }
}
