import {type Result} from '../../../../shared-kernel/result/Result.js';
import {
  MixedCurrencyInRangeError,
} from '../../domain/errors/ReportingErrors.js';
import {type IReportingReadRepository} from '../../domain/repositories/IReportingReadRepository.js';
import {type ExportData} from '../../domain/value-objects/Receipt.js';


export type GetExportAllDataError = MixedCurrencyInRangeError;

export class ExportAllData {
  constructor(private readonly reports: IReportingReadRepository) {
  }

  async execute(): Promise<Result<ExportData, GetExportAllDataError>> {
    return this.reports.exportAllData();
  }
}
