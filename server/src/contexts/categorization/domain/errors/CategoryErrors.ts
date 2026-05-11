import { DomainError } from '../../../../shared-kernel/errors/DomainError.js';

export class CategoryNotFoundError extends DomainError {
  readonly code = 'category_not_found';
}

export class DuplicateCategoryNameError extends DomainError {
  readonly code = 'duplicate_category_name';
}

export class CategoryReorderMismatchError extends DomainError {
  readonly code = 'category_reorder_mismatch';
}
