import { type Id, makeIdFactory } from '../../../../shared-kernel/identifier/Identifier.js';

export type CategoryId = Id<'CategoryId'>;
export const CategoryId = makeIdFactory<'CategoryId'>('CategoryId');
