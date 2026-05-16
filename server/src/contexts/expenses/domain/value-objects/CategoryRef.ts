import { type Id, makeIdFactory } from '../../../../shared-kernel/identifier/Identifier.js';

/**
 * Foreign-key reference to a Category owned by the categorization context.
 * The Expense aggregate carries its own branded type for the FK so its
 * domain layer stays free of cross-context imports. Cross-context lookups
 * happen via `application/services/ReferenceValidator`.
 */
export type CategoryRef = Id<'CategoryRef'>;
export const CategoryRef = makeIdFactory<'CategoryRef'>('CategoryRef');
