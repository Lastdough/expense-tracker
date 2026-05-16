import { type Id, makeIdFactory } from '../../../../shared-kernel/identifier/Identifier.js';

export type ExpenseId = Id<'ExpenseId'>;
export const ExpenseId = makeIdFactory<'ExpenseId'>('ExpenseId');
