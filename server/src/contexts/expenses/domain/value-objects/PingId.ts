import { type Id, makeIdFactory } from '../../../../shared-kernel/identifier/Identifier.js';

export type PingId = Id<'PingId'>;
export const PingId = makeIdFactory<'PingId'>('PingId');
