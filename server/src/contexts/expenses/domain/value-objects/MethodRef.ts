import { type Id, makeIdFactory } from '../../../../shared-kernel/identifier/Identifier.js';

/** Foreign-key reference to a Method owned by the categorization context. */
export type MethodRef = Id<'MethodRef'>;
export const MethodRef = makeIdFactory<'MethodRef'>('MethodRef');
