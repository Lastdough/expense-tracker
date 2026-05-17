import { Money } from '../../../../shared-kernel/money/Money.js';
import { err, ok, type Result } from '../../../../shared-kernel/result/Result.js';
import { type GetMonthlyBudget } from '../../../budgeting/application/use-cases/GetMonthlyBudget.js';
import {
  BudgetCurrencyMismatchError,
  InvalidMonthError,
  MixedCurrencyInRangeError,
} from '../../domain/errors/ReportingErrors.js';
import { type AvailableBudgetSnapshot } from '../../domain/value-objects/AvailableBudget.js';
import { monthRangeFromString } from '../../domain/value-objects/MonthRange.js';
import { type GetNetOwed } from './GetNetOwed.js';

export interface GetAvailableBudgetInput {
  readonly month: string;
}

export type GetAvailableBudgetError =
  | InvalidMonthError
  | MixedCurrencyInRangeError
  | BudgetCurrencyMismatchError;

export class GetAvailableBudget {
  constructor(
    private readonly getMonthlyBudget: GetMonthlyBudget,
    private readonly getNetOwed: GetNetOwed,
  ) {}

  async execute(
    input: GetAvailableBudgetInput,
  ): Promise<Result<AvailableBudgetSnapshot, GetAvailableBudgetError>> {
    const range = monthRangeFromString(input.month);
    if (!range.ok) return range;

    const budgetResult = await this.getMonthlyBudget.execute();
    if (!budgetResult.ok) return budgetResult;
    const budget = budgetResult.value.budget;

    const netOwedResult = await this.getNetOwed.execute({
      dateStart: range.value.start,
      dateEnd: range.value.end,
    });
    if (!netOwedResult.ok) {
      // InvalidDateRangeError cannot occur — we built the range ourselves.
      if (netOwedResult.error.code === 'mixed_currency_in_range') {
        return err(netOwedResult.error);
      }
      throw new RangeError(`Unexpected GetNetOwed error: ${netOwedResult.error.code}`);
    }
    const netOwedSnapshot = netOwedResult.value;

    if (budget === null) {
      // No budget set yet — surface netOwed so the UI can still render it,
      // but availableBudget is null until the user configures one.
      return ok({
        month: range.value.month,
        currency: netOwedSnapshot.currency,
        monthlyBudget: null,
        netOwed: netOwedSnapshot.netOwed,
        availableBudget: null,
      });
    }

    const budgetCurrency = budget.amount.currency;

    // No Unpaid/Early in the month → netOwed = 0 in budget currency, no mismatch possible.
    if (netOwedSnapshot.netOwed === null || netOwedSnapshot.currency === null) {
      const zero = Money.fromMinor(0n, budgetCurrency);
      return ok({
        month: range.value.month,
        currency: budgetCurrency,
        monthlyBudget: budget.amount,
        netOwed: zero,
        availableBudget: budget.amount.subtract(zero),
      });
    }

    if (netOwedSnapshot.currency !== budgetCurrency) {
      return err(
        new BudgetCurrencyMismatchError(
          `Monthly budget is in ${budgetCurrency} but expenses in ${range.value.month} are in ${netOwedSnapshot.currency}`,
        ),
      );
    }

    return ok({
      month: range.value.month,
      currency: budgetCurrency,
      monthlyBudget: budget.amount,
      netOwed: netOwedSnapshot.netOwed,
      availableBudget: budget.amount.subtract(netOwedSnapshot.netOwed),
    });
  }
}
