import { DomainError } from '../../../../shared-kernel/errors/DomainError.js';

export class MethodNotFoundError extends DomainError {
  readonly code = 'method_not_found';
}

export class DuplicateMethodNameError extends DomainError {
  readonly code = 'duplicate_method_name';
}

export class MethodReorderMismatchError extends DomainError {
  readonly code = 'method_reorder_mismatch';
}
