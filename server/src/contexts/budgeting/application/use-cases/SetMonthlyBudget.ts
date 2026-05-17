import { isCurrency } from '../../../../shared-kernel/money/Currency.js';
import { Money } from '../../../../shared-kernel/money/Money.js';
import { err, ok, type Result } from '../../../../shared-kernel/result/Result.js';
import { MonthlyBudget } from '../../domain/entities/MonthlyBudget.js';
import {
  InvalidMonthlyBudgetAmountError,
  UnsupportedCurrencyError,
} from '../../domain/errors/MonthlyBudgetErrors.js';
import { type IMonthlyBudgetRepository } from '../../domain/repositories/IMonthlyBudgetRepository.js';

export interface SetMonthlyBudgetInput {
  /** Major-units decimal string, e.g. "5000000" or "1234.50". */
  readonly amountMajor: string;
  readonly currency: string;
}

export type SetMonthlyBudgetError = InvalidMonthlyBudgetAmountError | UnsupportedCurrencyError;

export class SetMonthlyBudget {
  constructor(
    private readonly repo: IMonthlyBudgetRepository,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(
    input: SetMonthlyBudgetInput,
  ): Promise<Result<MonthlyBudget, SetMonthlyBudgetError>> {
    if (!isCurrency(input.currency)) {
      return err(new UnsupportedCurrencyError(`Unsupported currency "${input.currency}"`));
    }
    let amount: Money;
    try {
      amount = Money.fromMajor(input.amountMajor, input.currency);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return err(new InvalidMonthlyBudgetAmountError(message));
    }
    if (amount.isNegative()) {
      return err(new InvalidMonthlyBudgetAmountError('amount must be non-negative'));
    }

    const now = this.clock();
    const existing = await this.repo.get();
    const budget = existing
      ? (existing.change(amount, now), existing)
      : MonthlyBudget.create({ amount, now });
    await this.repo.save(budget);
    return ok(budget);
  }
}
