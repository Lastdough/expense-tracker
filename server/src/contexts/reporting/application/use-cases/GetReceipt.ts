import { err, type Result } from '../../../../shared-kernel/result/Result.js';
import {
  InvalidDateRangeError,
  MixedCurrencyInRangeError,
} from '../../domain/errors/ReportingErrors.js';
import { type IReportingReadRepository } from '../../domain/repositories/IReportingReadRepository.js';
import { type Receipt } from '../../domain/value-objects/Receipt.js';

export interface GetReceiptInput {
  readonly dateStart: Date;
  readonly dateEnd: Date;
}

export type GetReceiptError = InvalidDateRangeError | MixedCurrencyInRangeError;

export class GetReceipt {
  constructor(private readonly reports: IReportingReadRepository) {}

  async execute(input: GetReceiptInput): Promise<Result<Receipt, GetReceiptError>> {
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
    return this.reports.getReceipt({ start: input.dateStart, end: input.dateEnd });
  }
}
