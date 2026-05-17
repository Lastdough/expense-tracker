import { type EventBus } from '../../../../shared-kernel/domain-events/EventBus.js';
import { ExpenseDeleted } from '../../../expenses/application/events/index.js';
import { ReimbursementDeleted } from '../../domain/events/ReimbursementDeleted.js';
import { type IReimbursementRepository } from '../../domain/repositories/IReimbursementRepository.js';
import { ExpenseRef } from '../../domain/value-objects/ExpenseRef.js';

/**
 * On ExpenseDeleted, remove the linked Reimbursement and publish
 * ReimbursementDeleted. DB-level FK cascade is the safety net; this
 * handler runs first and emits the domain event.
 */
export class DeleteReimbursementOnExpenseDeleted {
  constructor(
    private readonly reimbursements: IReimbursementRepository,
    private readonly eventBus: EventBus,
    private readonly clock: () => Date = () => new Date(),
    private readonly logger: (msg: string, meta?: unknown) => void = (msg, meta) =>
      console.warn(msg, meta),
  ) {}

  async handle(event: ExpenseDeleted): Promise<void> {
    if (!ExpenseRef.isValid(event.payload.expenseId)) {
      this.logger('[reimbursements] ExpenseDeleted carried an invalid expenseId; skipping', {
        expenseId: event.payload.expenseId,
      });
      return;
    }
    const expenseRef = ExpenseRef.create(event.payload.expenseId);
    const existing = await this.reimbursements.findByExpenseId(expenseRef);
    if (!existing) {
      // Already absent — nothing to do, no event.
      return;
    }
    await this.reimbursements.deleteByExpenseId(expenseRef);
    this.eventBus.publish(
      new ReimbursementDeleted(
        { reimbursementId: existing.id, expenseId: existing.expenseId },
        this.clock(),
      ),
    );
  }
}
