import { type Result } from '../../../../shared-kernel/result/Result.js';
import { MixedCurrencyInRangeError } from '../errors/ReportingErrors.js';
import { type MonthlySummary } from '../value-objects/MonthlySummary.js';
import { type NetOwedSnapshot } from '../value-objects/NetOwed.js';

/**
 * Read-side repository for the reporting context. Implementations query the
 * shared persistence store across multiple tables and assemble projection
 * objects. Reporting reads tables (infrastructure-level), never another
 * context's domain — the dependency rule stays intact.
 */
export interface IReportingReadRepository {
  getMonthlySummary(range: {
    month: string;
    start: Date;
    end: Date;
  }): Promise<Result<MonthlySummary, MixedCurrencyInRangeError>>;

  getNetOwed(range: {
    start: Date;
    end: Date;
  }): Promise<Result<NetOwedSnapshot, MixedCurrencyInRangeError>>;
}
