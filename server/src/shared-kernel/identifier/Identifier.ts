/**
 * Phantom-typed branded primitives. `Brand<string, 'ExpenseId'>` is a string
 * at runtime but distinct from `Brand<string, 'CategoryId'>` at compile time —
 * passing the wrong ID into a function is a type error.
 *
 * The shared kernel only owns the pattern. Each aggregate declares its own
 * concrete ID in its own `domain/value-objects/`, e.g.:
 *
 *   export type ExpenseId = Id<'ExpenseId'>;
 *   export const ExpenseId = makeIdFactory<'ExpenseId'>('ExpenseId');
 */

declare const __brand: unique symbol;

export type Brand<K, T extends string> = K & { readonly [__brand]: T };

export type Id<TBrand extends string> = Brand<string, TBrand>;

export interface IdFactory<TBrand extends string> {
  /** Validates and brands the raw string. Throws on invalid input. */
  create(raw: string): Id<TBrand>;
  isValid(raw: string): boolean;
}

const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuidV4(raw: string): boolean {
  return UUID_V4_RE.test(raw);
}

export function makeIdFactory<TBrand extends string>(
  brand: TBrand,
  validator: (raw: string) => boolean = isUuidV4,
): IdFactory<TBrand> {
  return {
    create(raw: string): Id<TBrand> {
      if (!validator(raw)) {
        throw new RangeError(`Invalid ${brand}: "${raw}"`);
      }
      return raw as Id<TBrand>;
    },
    isValid: validator,
  };
}
