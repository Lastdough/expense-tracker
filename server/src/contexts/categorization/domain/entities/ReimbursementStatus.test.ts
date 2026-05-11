import { describe, expect, it } from 'vitest';
import { ReimbursementStatus } from './ReimbursementStatus.js';
import { ReimbursementStatusId } from '../value-objects/ReimbursementStatusId.js';

const id = ReimbursementStatusId.create('00000000-0000-4000-8000-000000000020');

function make(overrides: Partial<Parameters<typeof ReimbursementStatus.create>[0]> = {}) {
  return ReimbursementStatus.create({
    id,
    name: 'Non-Reimbursable',
    bgColor: '#e8eaed',
    textColor: '#000000',
    displayOrder: 0,
    ...overrides,
  });
}

describe('ReimbursementStatus entity', () => {
  it('builds, archives, renames, and reorders like Category', () => {
    const s = make({ name: '  Pending Reimbursement  ' });
    expect(s.name).toBe('Pending Reimbursement');
    expect(s.nameNormalized).toBe('pending reimbursement');

    s.rename('Early Reimbursement');
    expect(s.name).toBe('Early Reimbursement');

    s.changeColors({ bgColor: '#000000', textColor: '#ffffff' });
    expect(s.bgColor).toBe('#000000');

    s.archive();
    expect(s.isArchived).toBe(true);

    s.unarchive();
    expect(s.isArchived).toBe(false);

    s.reorderTo(3);
    expect(s.displayOrder).toBe(3);
  });

  it('rejects invariants the same way Category does', () => {
    expect(() => make({ name: '' })).toThrow(RangeError);
    expect(() => make({ bgColor: 'red' })).toThrow(RangeError);
    expect(() => make({ textColor: '#fff' })).toThrow(RangeError);
    expect(() => make({ displayOrder: -1 })).toThrow(RangeError);
  });
});
