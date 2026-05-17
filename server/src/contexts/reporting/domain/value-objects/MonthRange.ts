import { err, ok, type Result } from '../../../../shared-kernel/result/Result.js';
import { InvalidMonthError } from '../errors/ReportingErrors.js';

/**
 * Half-open date range covering a calendar month in UTC. `month` is the
 * canonical 'YYYY-MM' label preserved through the projection. `end` is the
 * first instant of the next month — callers use `>= start && < end`.
 */
export interface MonthRange {
  readonly month: string;
  readonly start: Date;
  readonly end: Date;
}

const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

export function monthRangeFromString(month: string): Result<MonthRange, InvalidMonthError> {
  const match = MONTH_RE.exec(month);
  if (!match) {
    return err(new InvalidMonthError(`month must match YYYY-MM (got "${month}")`));
  }
  const year = Number(match[1]);
  const m = Number(match[2]); // 1-12
  if (year < 1970 || year > 9999) {
    return err(new InvalidMonthError(`year out of range (got ${year})`));
  }
  const start = new Date(Date.UTC(year, m - 1, 1));
  const end = new Date(Date.UTC(m === 12 ? year + 1 : year, m === 12 ? 0 : m, 1));
  return ok({ month, start, end });
}
