import { type DomainEvent } from './DomainEvent.js';

export type EventHandler<TEvent extends DomainEvent = DomainEvent> = (
  event: TEvent,
) => void | Promise<void>;

export type Unsubscribe = () => void;

/**
 * Pub/sub for domain events. Aggregates collect events; the use case publishes
 * them after persistence succeeds. The interface stays minimal so a real broker
 * (Redis, NATS, etc.) can replace the in-memory implementation without
 * touching subscriber code.
 */
export interface EventBus {
  publish(event: DomainEvent): void | Promise<void>;
  subscribe<TEvent extends DomainEvent>(
    eventType: string,
    handler: EventHandler<TEvent>,
  ): Unsubscribe;
}
