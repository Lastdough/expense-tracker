import { z } from 'zod';

const MonthString = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'month must match YYYY-MM' });

const Iso = z.iso.datetime({ offset: true, message: 'must be ISO 8601 datetime' });

export const MonthlySummaryQuery = z.object({
  month: MonthString,
});

export const NetOwedQuery = z.object({
  dateStart: Iso,
  dateEnd: Iso,
});

export const AvailableBudgetQuery = z.object({
  month: MonthString,
});

export const ReceiptQuery = z.object({
  dateStart: Iso,
  dateEnd: Iso,
  format: z.enum(['json', 'html', 'csv']).default('json'),
  simple: z.coerce.boolean().default(true),
});

export const ExportAllDataQuery = z.object({
  simple: z.coerce.boolean().default(true),
});
