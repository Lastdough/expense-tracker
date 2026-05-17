import { DomainError } from '../../../../shared-kernel/errors/DomainError.js';

export class InvalidMonthlyBudgetAmountError extends DomainError {
  readonly code = 'invalid_monthly_budget_amount';
}

export class UnsupportedCurrencyError extends DomainError {
  readonly code = 'unsupported_currency';
}
