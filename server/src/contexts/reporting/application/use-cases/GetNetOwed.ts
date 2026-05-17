import { err, type Result } from '../../../../shared-kernel/result/Result.js';
import {
  InvalidDateRangeError,
  MixedCurrencyInRangeError,
} from '../../domain/errors/ReportingErrors.js';
import { type IReportingReadRepository } from '../../domain/repositories/IReportingReadRepository.js';
import { type NetOwedSnapshot } from '../../domain/value-objects/NetOwed.js';

export interface GetNetOwedInput {
  readonly dateStart: Date;
  readonly dateEnd: Date;
}

export type GetNetOwedError = InvalidDateRangeError | MixedCurrencyInRangeError;

export class GetNetOwed {
  constructor(private readonly reports: IReportingReadRepository) {}

  async execute(input: GetNetOwedInput): Promise<Result<NetOwedSnapshot, GetNetOwedError>> {
    if (
      !(input.dateStart instanceof Date) ||
      Number.isNaN(input.dateStart.getTime()) ||
      !(input.dateEnd instanceof Date) ||
      Number.isNaN(input.dateEnd.getTime())
    ) {
      return err(new InvalidDateRangeError('dateStart and dateEnd must be valid Dates'));
    }
    if (input.dateStart.getTime() >= input.dateEnd.getTime()) {
      return err(new InvalidDateRangeError('dateStart must be before dateEnd'));
    }
    return this.reports.getNetOwed({ start: input.dateStart, end: input.dateEnd });
  }
}
