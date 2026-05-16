import { DomainError } from '../../../../shared-kernel/errors/DomainError.js';

export class ExpenseNotFoundError extends DomainError {
  readonly code = 'expense_not_found';
}

export class InvalidExpenseAmountError extends DomainError {
  readonly code = 'invalid_expense_amount';
}

export class InvalidExpenseDescriptionError extends DomainError {
  readonly code = 'invalid_expense_description';
}

export class InvalidExpenseDateError extends DomainError {
  readonly code = 'invalid_expense_date';
}

export type ReferenceField = 'categoryId' | 'methodId' | 'reimbursementStatusId';

export class ReferenceNotFoundError extends DomainError {
  readonly code = 'reference_not_found';
  constructor(
    public readonly field: ReferenceField,
    public readonly referenceId: string,
    message?: string,
  ) {
    super(message ?? `Reference "${field}=${referenceId}" is missing or archived.`);
  }
}

export class InvalidPaginationError extends DomainError {
  readonly code = 'invalid_pagination';
}

export class InvalidExpenseIdError extends DomainError {
  readonly code = 'invalid_expense_id';
}
