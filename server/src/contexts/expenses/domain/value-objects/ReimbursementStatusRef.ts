import { type Id, makeIdFactory } from '../../../../shared-kernel/identifier/Identifier.js';

/** Foreign-key reference to a ReimbursementStatus owned by the categorization context. */
export type ReimbursementStatusRef = Id<'ReimbursementStatusRef'>;
export const ReimbursementStatusRef = makeIdFactory<'ReimbursementStatusRef'>(
  'ReimbursementStatusRef',
);
