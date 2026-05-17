import { DomainError } from '../../../../shared-kernel/errors/DomainError.js';

export class InvalidMonthError extends DomainError {
  readonly code = 'invalid_month';
}

export class InvalidDateRangeError extends DomainError {
  readonly code = 'invalid_date_range';
}

export class MixedCurrencyInRangeError extends DomainError {
  readonly code = 'mixed_currency_in_range';
}

export class BudgetCurrencyMismatchError extends DomainError {
  readonly code = 'budget_currency_mismatch';
}
