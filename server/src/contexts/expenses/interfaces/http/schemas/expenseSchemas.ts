import { z } from 'zod';

const TransactionDate = z.iso.datetime({ offset: true, message: 'transactionDate must be ISO datetime' });
const AmountInput = z.string().min(1, 'amountInput must not be empty').max(128);
const Description = z.string().min(1, 'description must not be empty').max(280);
const Uuid = z.uuid();

export const RecordExpenseBody = z.object({
  transactionDate: TransactionDate,
  amountInput: AmountInput,
  description: Description,
  categoryId: Uuid,
  methodId: Uuid,
  reimbursementStatusId: Uuid,
});

export const EditExpenseBody = z
  .object({
    transactionDate: TransactionDate.optional(),
    amountInput: AmountInput.optional(),
    description: Description.optional(),
    categoryId: Uuid.optional(),
    methodId: Uuid.optional(),
    reimbursementStatusId: Uuid.optional(),
  })
  .refine((b) => Object.values(b).some((v) => v !== undefined), {
    message: 'At least one field must be provided',
  });

export const ListExpensesQuery = z.object({
  dateStart: z.iso.datetime({ offset: true }).optional(),
  dateEnd: z.iso.datetime({ offset: true }).optional(),
  categoryId: Uuid.optional(),
  methodId: Uuid.optional(),
  reimbursementStatusId: Uuid.optional(),
  descriptionQuery: z.string().min(1).max(280).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export type RecordExpenseBody = z.infer<typeof RecordExpenseBody>;
export type EditExpenseBody = z.infer<typeof EditExpenseBody>;
export type ListExpensesQuery = z.infer<typeof ListExpensesQuery>;
