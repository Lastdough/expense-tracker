import { DomainError } from '../../../../shared-kernel/errors/DomainError.js';

export type ReimbursementStateKind =
  | 'NonReimbursable'
  | 'UnpaidReimbursable'
  | 'PaidReimbursable'
  | 'EarlyReimbursement'
  | 'PendingReimbursement';

export class ReimbursementNotFoundError extends DomainError {
  readonly code = 'reimbursement_not_found';
}

export class IllegalTransitionError extends DomainError {
  readonly code = 'illegal_transition';
  constructor(
    public readonly from: ReimbursementStateKind,
    public readonly to: ReimbursementStateKind,
    message?: string,
  ) {
    super(message ?? `Illegal reimbursement transition: ${from} → ${to}`);
  }
}

export class InvalidReimbursementDateError extends DomainError {
  readonly code = 'invalid_reimbursement_date';
}

export class InvalidReimbursementIdError extends DomainError {
  readonly code = 'invalid_reimbursement_id';
}

export class InvalidExpenseRefError extends DomainError {
  readonly code = 'invalid_expense_ref';
}

export class ReimbursementAlreadyExistsError extends DomainError {
  readonly code = 'reimbursement_already_exists';
}

export class UnknownReimbursementStatusKindError extends DomainError {
  readonly code = 'unknown_reimbursement_status_kind';
}
