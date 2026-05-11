/**
 * Base shape every domain event satisfies. Concrete events live in each
 * context's `domain/events/` and extend this with a stable string `type`
 * (used for routing) and a typed `payload`.
 */
export interface DomainEvent<TPayload = unknown> {
  readonly type: string;
  readonly occurredAt: Date;
  readonly payload: TPayload;
}
