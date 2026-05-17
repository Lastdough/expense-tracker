import { beforeEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { type DomainEvent } from '../../../../shared-kernel/domain-events/DomainEvent.js';
import { InMemoryEventBus } from '../../../../shared-kernel/domain-events/InMemoryEventBus.js';
import { type ReimbursementStatusKind } from '../../../categorization/application/contracts/index.js';
import { type ReimbursementStatusKindLookup } from '../../../categorization/application/services/ReimbursementStatusKindLookup.js';
import {
  ExpenseDeleted,
  ExpenseRecorded,
} from '../../../expenses/application/events/index.js';
import { Reimbursement } from '../../domain/entities/Reimbursement.js';
import { ReimbursementId } from '../../domain/value-objects/ReimbursementId.js';
import { ExpenseRef } from '../../domain/value-objects/ExpenseRef.js';
import {
  unpaidReimbursable,
  type ReimbursementState,
} from '../../domain/value-objects/ReimbursementState.js';
import { type IReimbursementRepository } from '../../domain/repositories/IReimbursementRepository.js';
import { ReimbursementCreated } from '../../domain/events/ReimbursementCreated.js';
import { ReimbursementDeleted } from '../../domain/events/ReimbursementDeleted.js';
import { CreateReimbursementOnExpenseRecorded } from './CreateReimbursementOnExpenseRecorded.js';
import { DeleteReimbursementOnExpenseDeleted } from './DeleteReimbursementOnExpenseDeleted.js';

class FakeRepo implements IReimbursementRepository {
  readonly rows = new Map<string, Reimbursement>();
  async save(r: Reimbursement): Promise<void> {
    this.rows.set(r.id, r);
  }
  async delete(id: ReimbursementId): Promise<void> {
    this.rows.delete(id);
  }
  async deleteByExpenseId(expenseId: ExpenseRef): Promise<void> {
    for (const [k, v] of this.rows) if (v.expenseId === expenseId) this.rows.delete(k);
  }
  async findById(id: ReimbursementId): Promise<Reimbursement | null> {
    return this.rows.get(id) ?? null;
  }
  async findByExpenseId(expenseId: ExpenseRef): Promise<Reimbursement | null> {
    for (const r of this.rows.values()) if (r.expenseId === expenseId) return r;
    return null;
  }
  async findUnpaidReimbursables(): Promise<Reimbursement[]> {
    return [];
  }
  seed(state: ReimbursementState, expenseId: string, now: Date): Reimbursement {
    const r = Reimbursement.create({
      id: ReimbursementId.create(randomUUID()),
      expenseId: ExpenseRef.create(expenseId),
      initialState: state,
      now,
    });
    this.rows.set(r.id, r);
    return r;
  }
}

class FakeKindLookup implements Pick<ReimbursementStatusKindLookup, 'kindById'> {
  private readonly map = new Map<string, ReimbursementStatusKind>();
  set(id: string, kind: ReimbursementStatusKind): void {
    this.map.set(id, kind);
  }
  async kindById(rawId: string): Promise<ReimbursementStatusKind | null> {
    return this.map.get(rawId) ?? null;
  }
}

function makeExpenseRecorded(args: {
  expenseId: string;
  reimbursementStatusId: string;
}): ExpenseRecorded {
  return new ExpenseRecorded(
    {
      expenseId: args.expenseId,
      transactionDate: '2026-05-17T00:00:00.000Z',
      amountMinor: '100000',
      currency: 'IDR',
      description: 'Lunch',
      categoryId: randomUUID(),
      methodId: randomUUID(),
      reimbursementStatusId: args.reimbursementStatusId,
    },
    new Date('2026-05-17T11:00:00.000Z'),
  );
}

describe('CreateReimbursementOnExpenseRecorded', () => {
  let repo: FakeRepo;
  let lookup: FakeKindLookup;
  let bus: InMemoryEventBus;
  let events: DomainEvent[];
  const now = new Date('2026-05-17T12:00:00.000Z');

  beforeEach(() => {
    repo = new FakeRepo();
    lookup = new FakeKindLookup();
    bus = new InMemoryEventBus();
    events = [];
    bus.subscribe(ReimbursementCreated.type, (e) => {
      events.push(e);
    });
  });

  it.each([
    ['NonReimbursable', { kind: 'NonReimbursable' }],
    ['UnpaidReimbursable', { kind: 'UnpaidReimbursable' }],
    ['PendingReimbursement', { kind: 'PendingReimbursement' }],
  ] as const)('seeds a %s reimbursement when ExpenseRecorded fires', async (kind, expectedState) => {
    const statusId = randomUUID();
    const expenseId = randomUUID();
    lookup.set(statusId, kind);
    const handler = new CreateReimbursementOnExpenseRecorded(
      repo,
      lookup as unknown as ReimbursementStatusKindLookup,
      bus,
      () => now,
    );
    await handler.handle(makeExpenseRecorded({ expenseId, reimbursementStatusId: statusId }));

    expect(repo.rows.size).toBe(1);
    const created = [...repo.rows.values()][0]!;
    expect(created.expenseId).toBe(expenseId);
    expect(created.state).toEqual(expectedState);
    expect(events).toHaveLength(1);
    const payload = events[0]!.payload as {
      reimbursementId: string;
      expenseId: string;
      initialKind: string;
    };
    expect(payload.expenseId).toBe(expenseId);
    expect(payload.initialKind).toBe(kind);
  });

  it('seeds PaidReimbursable with paidAt=now and includes it in the event payload', async () => {
    const statusId = randomUUID();
    const expenseId = randomUUID();
    lookup.set(statusId, 'PaidReimbursable');
    const handler = new CreateReimbursementOnExpenseRecorded(
      repo,
      lookup as unknown as ReimbursementStatusKindLookup,
      bus,
      () => now,
    );
    await handler.handle(makeExpenseRecorded({ expenseId, reimbursementStatusId: statusId }));

    const created = [...repo.rows.values()][0]!;
    expect(created.state).toEqual({ kind: 'PaidReimbursable', paidAt: now });
    const payload = events[0]!.payload as { paidAt: string | null; receivedAt: string | null };
    expect(payload.paidAt).toBe(now.toISOString());
    expect(payload.receivedAt).toBeNull();
  });

  it('seeds EarlyReimbursement with receivedAt=now', async () => {
    const statusId = randomUUID();
    const expenseId = randomUUID();
    lookup.set(statusId, 'EarlyReimbursement');
    const handler = new CreateReimbursementOnExpenseRecorded(
      repo,
      lookup as unknown as ReimbursementStatusKindLookup,
      bus,
      () => now,
    );
    await handler.handle(makeExpenseRecorded({ expenseId, reimbursementStatusId: statusId }));

    const created = [...repo.rows.values()][0]!;
    expect(created.state).toEqual({ kind: 'EarlyReimbursement', receivedAt: now });
  });

  it('is idempotent — a replay does not create a duplicate or emit again', async () => {
    const statusId = randomUUID();
    const expenseId = randomUUID();
    lookup.set(statusId, 'UnpaidReimbursable');
    const handler = new CreateReimbursementOnExpenseRecorded(
      repo,
      lookup as unknown as ReimbursementStatusKindLookup,
      bus,
      () => now,
    );
    const event = makeExpenseRecorded({ expenseId, reimbursementStatusId: statusId });
    await handler.handle(event);
    await handler.handle(event);

    expect(repo.rows.size).toBe(1);
    expect(events).toHaveLength(1);
  });

  it('logs and skips when the status kind cannot be resolved', async () => {
    const log = vi.fn();
    const handler = new CreateReimbursementOnExpenseRecorded(
      repo,
      lookup as unknown as ReimbursementStatusKindLookup,
      bus,
      () => now,
      randomUUID,
      log,
    );
    await handler.handle(
      makeExpenseRecorded({ expenseId: randomUUID(), reimbursementStatusId: randomUUID() }),
    );
    expect(repo.rows.size).toBe(0);
    expect(events).toHaveLength(0);
    expect(log).toHaveBeenCalledTimes(1);
  });

  it('logs and skips on malformed expenseId', async () => {
    const log = vi.fn();
    const handler = new CreateReimbursementOnExpenseRecorded(
      repo,
      lookup as unknown as ReimbursementStatusKindLookup,
      bus,
      () => now,
      randomUUID,
      log,
    );
    await handler.handle(
      makeExpenseRecorded({ expenseId: 'nope', reimbursementStatusId: randomUUID() }),
    );
    expect(repo.rows.size).toBe(0);
    expect(log).toHaveBeenCalledTimes(1);
  });
});

describe('DeleteReimbursementOnExpenseDeleted', () => {
  let repo: FakeRepo;
  let bus: InMemoryEventBus;
  let events: DomainEvent[];
  const now = new Date('2026-05-17T12:00:00.000Z');

  beforeEach(() => {
    repo = new FakeRepo();
    bus = new InMemoryEventBus();
    events = [];
    bus.subscribe(ReimbursementDeleted.type, (e) => {
      events.push(e);
    });
  });

  it('deletes the matching Reimbursement and emits ReimbursementDeleted', async () => {
    const expenseId = randomUUID();
    const seeded = repo.seed(unpaidReimbursable(), expenseId, now);
    const handler = new DeleteReimbursementOnExpenseDeleted(repo, bus, () => now);
    await handler.handle(
      new ExpenseDeleted({ expenseId }, now),
    );
    expect(repo.rows.size).toBe(0);
    expect(events).toHaveLength(1);
    const payload = events[0]!.payload as { reimbursementId: string; expenseId: string };
    expect(payload.reimbursementId).toBe(seeded.id);
    expect(payload.expenseId).toBe(expenseId);
  });

  it('is silent when no Reimbursement exists for the deleted expense', async () => {
    const handler = new DeleteReimbursementOnExpenseDeleted(repo, bus, () => now);
    await handler.handle(new ExpenseDeleted({ expenseId: randomUUID() }, now));
    expect(events).toHaveLength(0);
  });

  it('logs and skips on a malformed expenseId', async () => {
    const log = vi.fn();
    const handler = new DeleteReimbursementOnExpenseDeleted(repo, bus, () => now, log);
    await handler.handle(new ExpenseDeleted({ expenseId: 'nope' }, now));
    expect(events).toHaveLength(0);
    expect(log).toHaveBeenCalledTimes(1);
  });
});
