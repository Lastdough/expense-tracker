import { z } from 'zod';

/**
 * Max CSV size accepted by the import endpoint. 2 MB ≈ 25k typical rows;
 * comfortably above any realistic single-user history. Express's default
 * `json` limit (100 KB) is too small — bumped at the route level.
 */
export const MAX_CSV_BYTES = 2 * 1024 * 1024;

export const ImportExpensesBody = z.object({
  csvText: z
    .string()
    .min(1, 'csvText must not be empty')
    .max(MAX_CSV_BYTES, `csvText must be ≤ ${MAX_CSV_BYTES} bytes`),
  defaultYear: z.coerce.number().int().min(1900).max(9999),
  dryRun: z.boolean().optional().default(true),
});

export type ImportExpensesBody = z.infer<typeof ImportExpensesBody>;
