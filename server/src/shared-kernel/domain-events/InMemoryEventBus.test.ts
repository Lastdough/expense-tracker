import { describe, expect, it, vi } from 'vitest';
import { type DomainEvent } from './DomainEvent.js';
import { InMemoryEventBus } from './InMemoryEventBus.js';

interface ExpenseRecorded extends DomainEvent<{ id: string; amount: number }> {
  type: 'ExpenseRecorded';
}

interface ExpenseDeleted extends DomainEvent<{ id: string }> {
  type: 'ExpenseDeleted';
}

function makeRecorded(id: string, amount: number): ExpenseRecorded {
  return {
    type: 'ExpenseRecorded',
    occurredAt: new Date(),
    payload: { id, amount },
  };
}

describe('InMemoryEventBus', () => {
  it('publishing with no subscribers is a no-op', () => {
    const bus = new InMemoryEventBus();
    expect(() => bus.publish(makeRecorded('e1', 100))).not.toThrow();
  });

  it('delivers events to subscribers of the matching type', () => {
    const bus = new InMemoryEventBus();
    const handler = vi.fn();
    bus.subscribe<ExpenseRecorded>('ExpenseRecorded', handler);

    const event = makeRecorded('e1', 100);
    bus.publish(event);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(event);
  });

  it('does not cross-deliver between event types', () => {
    const bus = new InMemoryEventBus();
    const recordedHandler = vi.fn();
    const deletedHandler = vi.fn();
    bus.subscribe<ExpenseRecorded>('ExpenseRecorded', recordedHandler);
    bus.subscribe<ExpenseDeleted>('ExpenseDeleted', deletedHandler);

    bus.publish(makeRecorded('e1', 100));

    expect(recordedHandler).toHaveBeenCalledTimes(1);
    expect(deletedHandler).not.toHaveBeenCalled();
  });

  it('fans out to multiple subscribers of the same type', () => {
    const bus = new InMemoryEventBus();
    const a = vi.fn();
    const b = vi.fn();
    bus.subscribe<ExpenseRecorded>('ExpenseRecorded', a);
    bus.subscribe<ExpenseRecorded>('ExpenseRecorded', b);

    bus.publish(makeRecorded('e1', 100));

    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('isolates handler errors — one throwing handler does not break others', () => {
    const errors: unknown[] = [];
    const bus = new InMemoryEventBus((_type, err) => errors.push(err));
    const good = vi.fn();
    bus.subscribe<ExpenseRecorded>('ExpenseRecorded', () => {
      throw new Error('boom');
    });
    bus.subscribe<ExpenseRecorded>('ExpenseRecorded', good);

    expect(() => bus.publish(makeRecorded('e1', 100))).not.toThrow();

    expect(good).toHaveBeenCalledTimes(1);
    expect(errors).toHaveLength(1);
    expect((errors[0] as Error).message).toBe('boom');
  });

  it('reports async handler rejections via the error sink', async () => {
    const errors: unknown[] = [];
    const bus = new InMemoryEventBus((_type, err) => errors.push(err));
    bus.subscribe<ExpenseRecorded>('ExpenseRecorded', async () => {
      throw new Error('async boom');
    });

    bus.publish(makeRecorded('e1', 100));
    await new Promise((resolve) => setImmediate(resolve));

    expect(errors).toHaveLength(1);
    expect((errors[0] as Error).message).toBe('async boom');
  });

  it('unsubscribe stops further deliveries', () => {
    const bus = new InMemoryEventBus();
    const handler = vi.fn();
    const off = bus.subscribe<ExpenseRecorded>('ExpenseRecorded', handler);

    bus.publish(makeRecorded('e1', 100));
    off();
    bus.publish(makeRecorded('e2', 200));

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('unsubscribe is idempotent', () => {
    const bus = new InMemoryEventBus();
    const handler = vi.fn();
    const off = bus.subscribe<ExpenseRecorded>('ExpenseRecorded', handler);

    expect(() => {
      off();
      off();
    }).not.toThrow();

    bus.publish(makeRecorded('e1', 100));
    expect(handler).not.toHaveBeenCalled();
  });
});
