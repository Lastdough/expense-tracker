import { DomainError } from '../../../../shared-kernel/errors/DomainError.js';

export class ReimbursementStatusNotFoundError extends DomainError {
  readonly code = 'reimbursement_status_not_found';
}

export class DuplicateReimbursementStatusNameError extends DomainError {
  readonly code = 'duplicate_reimbursement_status_name';
}

export class ReimbursementStatusReorderMismatchError extends DomainError {
  readonly code = 'reimbursement_status_reorder_mismatch';
}
