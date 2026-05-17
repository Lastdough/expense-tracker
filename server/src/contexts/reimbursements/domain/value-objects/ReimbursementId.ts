import { type Id, makeIdFactory } from '../../../../shared-kernel/identifier/Identifier.js';

export type ReimbursementId = Id<'ReimbursementId'>;
export const ReimbursementId = makeIdFactory<'ReimbursementId'>('ReimbursementId');
