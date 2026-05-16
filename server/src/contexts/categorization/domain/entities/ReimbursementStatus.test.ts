import { ReimbursementStatus } from './ReimbursementStatus.js';
import { ReimbursementStatusId } from '../value-objects/ReimbursementStatusId.js';
import { runReferenceEntityContract } from './referenceEntity.contract.js';

const id = ReimbursementStatusId.create('00000000-0000-4000-8000-000000000020');

runReferenceEntityContract({
  label: 'ReimbursementStatus',
  create: (args) => ReimbursementStatus.create({ id, ...args }),
  defaults: { name: 'Non-Reimbursable', bgColor: '#e8eaed', textColor: '#000000' },
});
