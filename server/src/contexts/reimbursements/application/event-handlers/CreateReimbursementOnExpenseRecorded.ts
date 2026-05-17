import { randomUUID } from 'node:crypto';
import { type EventBus } from '../../../../shared-kernel/domain-events/EventBus.js';
import { type ReimbursementStatusKind } from '../../../categorization/application/contracts/index.js';
import { type ReimbursementStatusKindLookup } from '../../../categorization/application/services/ReimbursementStatusKindLookup.js';
import { ExpenseRecorded } from '../../../expenses/application/events/index.js';
import { Reimbursement } from '../../domain/entities/Reimbursement.js';
import { type ReimbursementStateKind } from '../../domain/errors/ReimbursementErrors.js';
import { ReimbursementCreated } from '../../domain/events/ReimbursementCreated.js';
import { type IReimbursementRepository } from '../../domain/repositories/IReimbursementRepository.js';
import { ExpenseRef } from '../../domain/value-objects/ExpenseRef.js';
import { ReimbursementId } from '../../domain/value-objects/ReimbursementId.js';
import {
  nonReimbursable,
  paidReimbursable,
  pendingReimbursement,
  unpaidReimbursable,
  earlyReimbursement,
  type ReimbursementState,
} from '../../domain/value-objects/ReimbursementState.js';

/**
 * On ExpenseRecorded, materialize a matching Reimbursement seeded from the
 * recorded status's kind. Idempotent: if a Reimbursement for the expense
 * already exists (replay), the handler does nothing.
 *
 * Cross-context coupling is via:
 *   - Subscribing to the ExpenseRecorded event type discriminator
 *     (application → application via the bus)
 *   - The ReimbursementStatusKindLookup application service
 */
export class CreateReimbursementOnExpenseRecorded {
  constructor(
    private readonly reimbursements: IReimbursementRepository,
    private readonly statusKinds: ReimbursementStatusKindLookup,
    private readonly eventBus: EventBus,
    private readonly clock: () => Date = () => new Date(),
    private readonly newId: () => string = randomUUID,
    private readonly logger: (msg: string, meta?: unknown) => void = (msg, meta) =>
      console.warn(msg, meta),
  ) {}

  async handle(event: ExpenseRecorded): Promise<void> {
    if (!ExpenseRef.isValid(event.payload.expenseId)) {
      this.logger('[reimbursements] ExpenseRecorded carried an invalid expenseId; skipping', {
        expenseId: event.payload.expenseId,
      });
      return;
    }
    const expenseRef = ExpenseRef.create(event.payload.expenseId);
    const existing = await this.reimbursements.findByExpenseId(expenseRef);
    if (existing) {
      // Idempotent replay path. No event is published the second time.
      return;
    }

    const kind = await this.statusKinds.kindById(event.payload.reimbursementStatusId);
    if (kind === null) {
      this.logger('[reimbursements] could not resolve kind for status; skipping creation', {
        expenseId: event.payload.expenseId,
        reimbursementStatusId: event.payload.reimbursementStatusId,
      });
      return;
    }

    const now = this.clock();
    const initialState = initialStateFor(kind, now);
    const reimbursement = Reimbursement.create({
      id: ReimbursementId.create(this.newId()),
      expenseId: expenseRef,
      initialState,
      now,
    });
    await this.reimbursements.save(reimbursement);

    this.eventBus.publish(
      new ReimbursementCreated(
        {
          reimbursementId: reimbursement.id,
          expenseId: reimbursement.expenseId,
          initialKind: initialState.kind satisfies ReimbursementStateKind,
          paidAt:
            initialState.kind === 'PaidReimbursable'
              ? initialState.paidAt.toISOString()
              : null,
          receivedAt:
            initialState.kind === 'EarlyReimbursement'
              ? initialState.receivedAt.toISOString()
              : null,
        },
        now,
      ),
    );
  }
}

/**
 * Map a categorization-side kind to an initial ReimbursementState. The two
 * date-bearing variants (PaidReimbursable, EarlyReimbursement) use `now` as
 * the seed date — the user can correct it later via mark-paid / mark-early
 * if needed. This avoids forcing a date prompt at expense-record time.
 */
function initialStateFor(
  kind: ReimbursementStatusKind,
  now: Date,
): ReimbursementState {
  switch (kind) {
    case 'NonReimbursable':
      return nonReimbursable();
    case 'UnpaidReimbursable':
      return unpaidReimbursable();
    case 'PendingReimbursement':
      return pendingReimbursement();
    case 'PaidReimbursable':
      return paidReimbursable(now);
    case 'EarlyReimbursement':
      return earlyReimbursement(now);
  }
}
