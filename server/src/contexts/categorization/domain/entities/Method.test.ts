import { Method } from './Method.js';
import { MethodId } from '../value-objects/MethodId.js';
import { runReferenceEntityContract } from './referenceEntity.contract.js';

const id = MethodId.create('00000000-0000-4000-8000-000000000010');

runReferenceEntityContract({
  label: 'Method',
  create: (args) => Method.create({ id, ...args }),
  defaults: { name: 'Mandiri', bgColor: '#143361', textColor: '#a8c0e0' },
});
