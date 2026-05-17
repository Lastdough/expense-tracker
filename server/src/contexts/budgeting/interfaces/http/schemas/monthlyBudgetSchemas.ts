import { z } from 'zod';

export const SetMonthlyBudgetBody = z.object({
  amountMajor: z.string().min(1, 'amountMajor must be a non-empty decimal string'),
  currency: z.string().min(1),
});
