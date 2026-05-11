import { type DomainEvent } from './DomainEvent.js';
import { type EventBus, type EventHandler, type Unsubscribe } from './EventBus.js';

/**
 * Synchronous fan-out bus for use within a single process. Handler errors
 * are isolated — a throwing handler does not prevent other handlers from
 * running and does not propagate up through `publish`. Async handlers'
 * rejections are reported via the optional `onHandlerError` callback (or
 * console.error by default), so subscribers can be observed without coupling
 * the publisher to handler outcomes.
 */
export class InMemoryEventBus implements EventBus {
  private readonly handlers = new Map<string, Set<EventHandler>>();
  private readonly onHandlerError: (eventType: string, error: unknown) => void;

  constructor(onHandlerError?: (eventType: string, error: unknown) => void) {
    this.onHandlerError =
      onHandlerError ??
      ((eventType, error) => {
        console.error(`[InMemoryEventBus] handler for "${eventType}" failed:`, error);
      });
  }

  publish(event: DomainEvent): void {
    const subs = this.handlers.get(event.type);
    if (!subs || subs.size === 0) return;
    for (const handler of subs) {
      try {
        const result = handler(event);
        if (result instanceof Promise) {
          result.catch((err: unknown) => this.onHandlerError(event.type, err));
        }
      } catch (err) {
        this.onHandlerError(event.type, err);
      }
    }
  }

  subscribe<TEvent extends DomainEvent>(
    eventType: string,
    handler: EventHandler<TEvent>,
  ): Unsubscribe {
    let set = this.handlers.get(eventType);
    if (!set) {
      set = new Set();
      this.handlers.set(eventType, set);
    }
    const erased = handler as EventHandler;
    set.add(erased);
    return () => {
      set.delete(erased);
    };
  }
}
