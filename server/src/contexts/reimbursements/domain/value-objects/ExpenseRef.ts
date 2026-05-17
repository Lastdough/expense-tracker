import { type Id, makeIdFactory } from '../../../../shared-kernel/identifier/Identifier.js';

/**
 * Foreign-key reference to an Expense owned by the expenses context.
 *
 * Defined locally here (rather than importing `ExpenseId` from the expenses
 * domain) because the dependency rule forbids cross-context domain imports.
 * Validity is enforced as a UUID v4; cross-context existence checks happen
 * at the application boundary.
 */
export type ExpenseRef = Id<'ExpenseRef'>;
export const ExpenseRef = makeIdFactory<'ExpenseRef'>('ExpenseRef');
