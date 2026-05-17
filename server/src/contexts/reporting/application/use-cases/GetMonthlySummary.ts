import { type Result } from '../../../../shared-kernel/result/Result.js';
import {
  InvalidMonthError,
  MixedCurrencyInRangeError,
} from '../../domain/errors/ReportingErrors.js';
import { type IReportingReadRepository } from '../../domain/repositories/IReportingReadRepository.js';
import { type MonthlySummary } from '../../domain/value-objects/MonthlySummary.js';
import { monthRangeFromString } from '../../domain/value-objects/MonthRange.js';

export interface GetMonthlySummaryInput {
  readonly month: string;
}

export type GetMonthlySummaryError = InvalidMonthError | MixedCurrencyInRangeError;

export class GetMonthlySummary {
  constructor(private readonly reports: IReportingReadRepository) {}

  async execute(
    input: GetMonthlySummaryInput,
  ): Promise<Result<MonthlySummary, GetMonthlySummaryError>> {
    const range = monthRangeFromString(input.month);
    if (!range.ok) return range;
    return this.reports.getMonthlySummary(range.value);
  }
}
