/**
 * Base class for expected, business-rule failures returned via Result.err.
 *
 * Each context defines its own concrete subclasses in
 * `<context>/domain/errors/` with stable `code` strings that HTTP layers can
 * map to status codes. Subclasses should never be thrown — they ride inside
 * Result. Throw plain Errors for programmer mistakes / invariant violations.
 */
export abstract class DomainError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
