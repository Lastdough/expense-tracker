import { err, ok, type Result } from '../../../../shared-kernel/result/Result.js';
import {
  IllegalTransitionError,
  InvalidReimbursementDateError,
  type ReimbursementStateKind,
} from '../errors/ReimbursementErrors.js';

// ── State variants ──────────────────────────────────────────────────────────
// Discriminated union. Variants that carry a date hold it on the state itself
// (not on the aggregate) so the date can't drift away from the kind it
// describes. See CLAUDE.md > Reimbursement state machine.

export type NonReimbursable = { readonly kind: 'NonReimbursable' };
export type UnpaidReimbursable = { readonly kind: 'UnpaidReimbursable' };
export type PaidReimbursable = { readonly kind: 'PaidReimbursable'; readonly paidAt: Date };
export type EarlyReimbursement = {
  readonly kind: 'EarlyReimbursement';
  readonly receivedAt: Date;
};
export type PendingReimbursement = { readonly kind: 'PendingReimbursement' };

export type ReimbursementState =
  | NonReimbursable
  | UnpaidReimbursable
  | PaidReimbursable
  | EarlyReimbursement
  | PendingReimbursement;

// ── Constructors ────────────────────────────────────────────────────────────
// Throw on structural invariants (matches Money / Expense). Date validation
// is the only such invariant here; transitions are an orthogonal concern
// handled below via Result.

function assertDate(value: Date, field: string): void {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new RangeError(`${field} must be a valid Date`);
  }
}

export const nonReimbursable = (): NonReimbursable => ({ kind: 'NonReimbursable' });
export const unpaidReimbursable = (): UnpaidReimbursable => ({ kind: 'UnpaidReimbursable' });
export const pendingReimbursement = (): PendingReimbursement => ({ kind: 'PendingReimbursement' });
export const paidReimbursable = (paidAt: Date): PaidReimbursable => {
  assertDate(paidAt, 'paidAt');
  return { kind: 'PaidReimbursable', paidAt };
};
export const earlyReimbursement = (receivedAt: Date): EarlyReimbursement => {
  assertDate(receivedAt, 'receivedAt');
  return { kind: 'EarlyReimbursement', receivedAt };
};

// ── Transition matrix ───────────────────────────────────────────────────────
// Source of truth for legal transitions. NonReimbursable and PaidReimbursable
// are terminal. UnpaidReimbursable → NonReimbursable is the one mistake-fix
// path (Milestone G decision 4).

const LEGAL: Readonly<Record<ReimbursementStateKind, ReadonlySet<ReimbursementStateKind>>> = {
  NonReimbursable: new Set(),
  UnpaidReimbursable: new Set([
    'PendingReimbursement',
    'EarlyReimbursement',
    'PaidReimbursable',
    'NonReimbursable',
  ]),
  PendingReimbursement: new Set([
    'UnpaidReimbursable',
    'EarlyReimbursement',
    'PaidReimbursable',
  ]),
  EarlyReimbursement: new Set([
    'UnpaidReimbursable',
    'PendingReimbursement',
    'PaidReimbursable',
  ]),
  PaidReimbursable: new Set(),
};

export function canTransitionTo(
  state: ReimbursementState,
  targetKind: ReimbursementStateKind,
): boolean {
  return LEGAL[state.kind].has(targetKind);
}

// ── Transitions ─────────────────────────────────────────────────────────────
// Return Result; never throw on illegal transitions. Date constructors above
// still throw on structural invariants — the application layer validates
// incoming dates before reaching here.

type TransitionError = IllegalTransitionError | InvalidReimbursementDateError;

function illegal(from: ReimbursementStateKind, to: ReimbursementStateKind) {
  return err(new IllegalTransitionError(from, to));
}

export function markAsPaid(
  state: ReimbursementState,
  paidAt: Date,
): Result<PaidReimbursable, TransitionError> {
  if (!canTransitionTo(state, 'PaidReimbursable')) {
    return illegal(state.kind, 'PaidReimbursable');
  }
  if (!(paidAt instanceof Date) || Number.isNaN(paidAt.getTime())) {
    return err(new InvalidReimbursementDateError('paidAt must be a valid Date'));
  }
  return ok(paidReimbursable(paidAt));
}

export function markAsEarly(
  state: ReimbursementState,
  receivedAt: Date,
): Result<EarlyReimbursement, TransitionError> {
  if (!canTransitionTo(state, 'EarlyReimbursement')) {
    return illegal(state.kind, 'EarlyReimbursement');
  }
  if (!(receivedAt instanceof Date) || Number.isNaN(receivedAt.getTime())) {
    return err(new InvalidReimbursementDateError('receivedAt must be a valid Date'));
  }
  return ok(earlyReimbursement(receivedAt));
}

export function markAsPending(
  state: ReimbursementState,
): Result<PendingReimbursement, IllegalTransitionError> {
  if (!canTransitionTo(state, 'PendingReimbursement')) {
    return illegal(state.kind, 'PendingReimbursement');
  }
  return ok(pendingReimbursement());
}

export function markAsUnpaid(
  state: ReimbursementState,
): Result<UnpaidReimbursable, IllegalTransitionError> {
  if (!canTransitionTo(state, 'UnpaidReimbursable')) {
    return illegal(state.kind, 'UnpaidReimbursable');
  }
  return ok(unpaidReimbursable());
}

export function markAsNonReimbursable(
  state: ReimbursementState,
): Result<NonReimbursable, IllegalTransitionError> {
  if (!canTransitionTo(state, 'NonReimbursable')) {
    return illegal(state.kind, 'NonReimbursable');
  }
  return ok(nonReimbursable());
}

// ── Equality (for tests; structural) ────────────────────────────────────────

export function equals(a: ReimbursementState, b: ReimbursementState): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'PaidReimbursable' && b.kind === 'PaidReimbursable') {
    return a.paidAt.getTime() === b.paidAt.getTime();
  }
  if (a.kind === 'EarlyReimbursement' && b.kind === 'EarlyReimbursement') {
    return a.receivedAt.getTime() === b.receivedAt.getTime();
  }
  return true;
}
