import { type Id, makeIdFactory } from '../../../../shared-kernel/identifier/Identifier.js';

export type MethodId = Id<'MethodId'>;
export const MethodId = makeIdFactory<'MethodId'>('MethodId');
