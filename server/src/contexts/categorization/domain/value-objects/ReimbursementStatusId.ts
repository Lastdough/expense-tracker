import { type Id, makeIdFactory } from '../../../../shared-kernel/identifier/Identifier.js';

export type ReimbursementStatusId = Id<'ReimbursementStatusId'>;
export const ReimbursementStatusId = makeIdFactory<'ReimbursementStatusId'>('ReimbursementStatusId');
