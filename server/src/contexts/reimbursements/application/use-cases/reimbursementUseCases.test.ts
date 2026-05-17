import { beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { type DomainEvent } from '../../../../shared-kernel/domain-events/DomainEvent.js';
import { InMemoryEventBus } from '../../../../shared-kernel/domain-events/InMemoryEventBus.js';
import { Reimbursement } from '../../domain/entities/Reimbursement.js';
import { ReimbursementId } from '../../domain/value-objects/ReimbursementId.js';
import { ExpenseRef } from '../../domain/value-objects/ExpenseRef.js';
import { type IReimbursementRepository } from '../../domain/repositories/IReimbursementRepository.js';
import {
  earlyReimbursement,
  nonReimbursable,
  paidReimbursable,
  pendingReimbursement,
  unpaidReimbursable,
  type ReimbursementState,
} from '../../domain/value-objects/ReimbursementState.js';
import { ReimbursementCreated } from '../../domain/events/ReimbursementCreated.js';
import { ReimbursementMarkedAsPaid } from '../../domain/events/ReimbursementMarkedAsPaid.js';
import { ReimbursementMarkedAsEarly } from '../../domain/events/ReimbursementMarkedAsEarly.js';
import { ReimbursementMarkedAsPending } from '../../domain/events/ReimbursementMarkedAsPending.js';
import { ReimbursementMarkedAsUnpaid } from '../../domain/events/ReimbursementMarkedAsUnpaid.js';
import { ReimbursementMarkedAsNonReimbursable } from '../../domain/events/ReimbursementMarkedAsNonReimbursable.js';
import { ReimbursementDeleted } from '../../domain/events/ReimbursementDeleted.js';
import { MarkAsPaid } from './MarkAsPaid.js';
import { MarkAsEarly } from './MarkAsEarly.js';
import { MarkAsPending } from './MarkAsPending.js';
import { MarkAsUnpaid } from './MarkAsUnpaid.js';
import { MarkAsNonReimbursable } from './MarkAsNonReimbursable.js';
import { GetReimbursement } from './GetReimbursement.js';
import { GetReimbursementByExpense } from './GetReimbursementByExpense.js';
import { ListUnpaidReimbursables } from './ListUnpaidReimbursables.js';

// ── Fake repository ─────────────────────────────────────────────────────────

class FakeReimbursementRepo implements IReimbursementRepository {
  readonly rows = new Map<string, Reimbursement>();
  // For findUnpaidReimbursables: also track the underlying expense's
  // transactionDate, since the real impl joins through Expense.
  readonly expenseDates = new Map<string, Date>();

  async save(r: Reimbursement): Promise<void> {
    this.rows.set(r.id, r);
  }
  async delete(id: ReimbursementId): Promise<void> {
    this.rows.delete(id);
  }
  async deleteByExpenseId(expenseId: ExpenseRef): Promise<void> {
    for (const [k, v] of this.rows) {
      if (v.expenseId === expenseId) this.rows.delete(k);
    }
  }
  async findById(id: ReimbursementId): Promise<Reimbursement | null> {
    return this.rows.get(id) ?? null;
  }
  async findByExpenseId(expenseId: ExpenseRef): Promise<Reimbursement | null> {
    for (const r of this.rows.values()) if (r.expenseId === expenseId) return r;
    return null;
  }
  async findUnpaidReimbursables(range: { start: Date; end: Date }): Promise<Reimbursement[]> {
    return [...this.rows.values()].filter((r) => {
      if (r.state.kind !== 'UnpaidReimbursable') return false;
      const tx = this.expenseDates.get(r.expenseId);
      if (!tx) return false;
      return tx >= range.start && tx < range.end;
    });
  }
  seed(state: ReimbursementState, when: Date = new Date('2026-05-17T10:00:00.000Z')): Reimbursement {
    const r = Reimbursement.create({
      id: ReimbursementId.create(randomUUID()),
      expenseId: ExpenseRef.create(randomUUID()),
      initialState: state,
      now: when,
    });
    this.rows.set(r.id, r);
    return r;
  }
}

interface Harness {
  repo: FakeReimbursementRepo;
  bus: InMemoryEventBus;
  events: DomainEvent[];
  now: Date;
  clock: () => Date;
  nowAt(iso: string): void;
}

function makeHarness(): Harness {
  const repo = new FakeReimbursementRepo();
  const bus = new InMemoryEventBus();
  const events: DomainEvent[] = [];
  for (const type of [
    ReimbursementCreated.type,
    ReimbursementMarkedAsPaid.type,
    ReimbursementMarkedAsEarly.type,
    ReimbursementMarkedAsPending.type,
    ReimbursementMarkedAsUnpaid.type,
    ReimbursementMarkedAsNonReimbursable.type,
    ReimbursementDeleted.type,
  ]) {
    bus.subscribe(type, (e) => {
      events.push(e);
    });
  }
  let now = new Date('2026-05-17T11:00:00.000Z');
  return {
    repo,
    bus,
    events,
    get now() {
      return now;
    },
    clock: () => now,
    nowAt(iso: string) {
      now = new Date(iso);
    },
  };
}

const PAID_AT = new Date('2026-05-20T00:00:00.000Z');
const RECEIVED_AT = new Date('2026-05-15T00:00:00.000Z');

// ── Transition use cases ────────────────────────────────────────────────────

describe('MarkAsPaid', () => {
  let h: Harness;
  beforeEach(() => {
    h = makeHarness();
  });

  it('transitions UnpaidReimbursable → PaidReimbursable and emits the event', async () => {
    const seeded = h.repo.seed(unpaidReimbursable());
    h.nowAt('2026-05-20T08:00:00.000Z');
    const result = await new MarkAsPaid(h.repo, h.bus, h.clock).execute({
      id: seeded.id,
      paidAt: PAID_AT,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.state).toEqual({ kind: 'PaidReimbursable', paidAt: PAID_AT });
    expect(result.value.updatedAt).toEqual(h.now);
    expect(h.events).toHaveLength(1);
    expect(h.events[0]).toBeInstanceOf(ReimbursementMarkedAsPaid);
    const payload = h.events[0]!.payload as { reimbursementId: string; paidAt: string };
    expect(payload.reimbursementId).toBe(seeded.id);
    expect(payload.paidAt).toBe(PAID_AT.toISOString());
  });

  it('returns illegal_transition from NonReimbursable and emits nothing', async () => {
    const seeded = h.repo.seed(nonReimbursable());
    const result = await new MarkAsPaid(h.repo, h.bus, h.clock).execute({
      id: seeded.id,
      paidAt: PAID_AT,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('illegal_transition');
    expect(h.events).toHaveLength(0);
  });

  it('returns reimbursement_not_found when id is unknown', async () => {
    const result = await new MarkAsPaid(h.repo, h.bus, h.clock).execute({
      id: randomUUID(),
      paidAt: PAID_AT,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('reimbursement_not_found');
  });

  it('returns invalid_reimbursement_id on a malformed id', async () => {
    const result = await new MarkAsPaid(h.repo, h.bus, h.clock).execute({
      id: 'not-a-uuid',
      paidAt: PAID_AT,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('invalid_reimbursement_id');
  });

  it('returns invalid_reimbursement_date on NaN paidAt', async () => {
    const seeded = h.repo.seed(unpaidReimbursable());
    const result = await new MarkAsPaid(h.repo, h.bus, h.clock).execute({
      id: seeded.id,
      paidAt: new Date(Number.NaN),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('invalid_reimbursement_date');
  });
});

describe('MarkAsEarly', () => {
  let h: Harness;
  beforeEach(() => {
    h = makeHarness();
  });

  it('transitions UnpaidReimbursable → EarlyReimbursement and emits the event', async () => {
    const seeded = h.repo.seed(unpaidReimbursable());
    const result = await new MarkAsEarly(h.repo, h.bus, h.clock).execute({
      id: seeded.id,
      receivedAt: RECEIVED_AT,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.state).toEqual({
      kind: 'EarlyReimbursement',
      receivedAt: RECEIVED_AT,
    });
    expect(h.events).toHaveLength(1);
    expect(h.events[0]).toBeInstanceOf(ReimbursementMarkedAsEarly);
  });

  it('returns illegal_transition from PaidReimbursable', async () => {
    const seeded = h.repo.seed(paidReimbursable(PAID_AT));
    const result = await new MarkAsEarly(h.repo, h.bus, h.clock).execute({
      id: seeded.id,
      receivedAt: RECEIVED_AT,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('illegal_transition');
  });
});

describe('MarkAsPending', () => {
  let h: Harness;
  beforeEach(() => {
    h = makeHarness();
  });

  it('transitions UnpaidReimbursable → PendingReimbursement', async () => {
    const seeded = h.repo.seed(unpaidReimbursable());
    const result = await new MarkAsPending(h.repo, h.bus, h.clock).execute({ id: seeded.id });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.state).toEqual({ kind: 'PendingReimbursement' });
    expect(h.events[0]).toBeInstanceOf(ReimbursementMarkedAsPending);
  });

  it('returns illegal_transition from PaidReimbursable', async () => {
    const seeded = h.repo.seed(paidReimbursable(PAID_AT));
    const result = await new MarkAsPending(h.repo, h.bus, h.clock).execute({ id: seeded.id });
    expect(result.ok).toBe(false);
  });
});

describe('MarkAsUnpaid', () => {
  let h: Harness;
  beforeEach(() => {
    h = makeHarness();
  });

  it('transitions PendingReimbursement → UnpaidReimbursable', async () => {
    const seeded = h.repo.seed(pendingReimbursement());
    const result = await new MarkAsUnpaid(h.repo, h.bus, h.clock).execute({ id: seeded.id });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.state).toEqual({ kind: 'UnpaidReimbursable' });
    expect(h.events[0]).toBeInstanceOf(ReimbursementMarkedAsUnpaid);
  });

  it('returns illegal_transition from UnpaidReimbursable (self)', async () => {
    const seeded = h.repo.seed(unpaidReimbursable());
    const result = await new MarkAsUnpaid(h.repo, h.bus, h.clock).execute({ id: seeded.id });
    expect(result.ok).toBe(false);
  });
});

describe('MarkAsNonReimbursable', () => {
  let h: Harness;
  beforeEach(() => {
    h = makeHarness();
  });

  it('transitions UnpaidReimbursable → NonReimbursable (mistake-fix path)', async () => {
    const seeded = h.repo.seed(unpaidReimbursable());
    const result = await new MarkAsNonReimbursable(h.repo, h.bus, h.clock).execute({
      id: seeded.id,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.state).toEqual({ kind: 'NonReimbursable' });
    expect(h.events[0]).toBeInstanceOf(ReimbursementMarkedAsNonReimbursable);
  });

  it('returns illegal_transition from PendingReimbursement', async () => {
    const seeded = h.repo.seed(pendingReimbursement());
    const result = await new MarkAsNonReimbursable(h.repo, h.bus, h.clock).execute({
      id: seeded.id,
    });
    expect(result.ok).toBe(false);
  });
});

// ── Read use cases ──────────────────────────────────────────────────────────

describe('GetReimbursement', () => {
  it('returns the reimbursement for a valid id', async () => {
    const h = makeHarness();
    const seeded = h.repo.seed(unpaidReimbursable());
    const result = await new GetReimbursement(h.repo).execute({ id: seeded.id });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.id).toBe(seeded.id);
  });

  it('returns reimbursement_not_found for an unknown id', async () => {
    const h = makeHarness();
    const result = await new GetReimbursement(h.repo).execute({ id: randomUUID() });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('reimbursement_not_found');
  });

  it('returns invalid_reimbursement_id for a malformed id', async () => {
    const h = makeHarness();
    const result = await new GetReimbursement(h.repo).execute({ id: 'nope' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('invalid_reimbursement_id');
  });
});

describe('GetReimbursementByExpense', () => {
  it('finds by expenseId', async () => {
    const h = makeHarness();
    const seeded = h.repo.seed(unpaidReimbursable());
    const result = await new GetReimbursementByExpense(h.repo).execute({
      expenseId: seeded.expenseId,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.expenseId).toBe(seeded.expenseId);
  });

  it('returns invalid_expense_ref for a malformed expenseId', async () => {
    const h = makeHarness();
    const result = await new GetReimbursementByExpense(h.repo).execute({ expenseId: 'nope' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('invalid_expense_ref');
  });

  it('returns reimbursement_not_found when nothing matches', async () => {
    const h = makeHarness();
    const result = await new GetReimbursementByExpense(h.repo).execute({
      expenseId: randomUUID(),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('reimbursement_not_found');
  });
});

describe('ListUnpaidReimbursables', () => {
  it('filters by kind and by underlying expense date range', async () => {
    const h = makeHarness();
    const inRange = h.repo.seed(unpaidReimbursable());
    h.repo.expenseDates.set(inRange.expenseId, new Date('2026-05-17T00:00:00.000Z'));
    const outOfRange = h.repo.seed(unpaidReimbursable());
    h.repo.expenseDates.set(outOfRange.expenseId, new Date('2026-04-01T00:00:00.000Z'));
    const wrongKind = h.repo.seed(paidReimbursable(PAID_AT));
    h.repo.expenseDates.set(wrongKind.expenseId, new Date('2026-05-17T00:00:00.000Z'));
    const earlyKind = h.repo.seed(earlyReimbursement(RECEIVED_AT));
    h.repo.expenseDates.set(earlyKind.expenseId, new Date('2026-05-17T00:00:00.000Z'));

    const result = await new ListUnpaidReimbursables(h.repo).execute({
      dateStart: new Date('2026-05-01T00:00:00.000Z'),
      dateEnd: new Date('2026-06-01T00:00:00.000Z'),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.items.map((r) => r.id)).toEqual([inRange.id]);
  });

  it('rejects an inverted date range', async () => {
    const h = makeHarness();
    const result = await new ListUnpaidReimbursables(h.repo).execute({
      dateStart: new Date('2026-06-01T00:00:00.000Z'),
      dateEnd: new Date('2026-05-01T00:00:00.000Z'),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('invalid_date_range');
  });

  it('rejects NaN dates', async () => {
    const h = makeHarness();
    const result = await new ListUnpaidReimbursables(h.repo).execute({
      dateStart: new Date(Number.NaN),
      dateEnd: new Date('2026-06-01T00:00:00.000Z'),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('invalid_date_range');
  });
});
