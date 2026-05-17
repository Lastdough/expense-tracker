import { z } from 'zod';

const MonthString = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'month must match YYYY-MM' });

export const MonthlySummaryQuery = z.object({
  month: MonthString,
});
