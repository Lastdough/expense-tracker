import { describe, expect, it } from 'vitest';
import { ReimbursementStatus } from './ReimbursementStatus.js';
import { ReimbursementStatusId } from '../value-objects/ReimbursementStatusId.js';
import { runReferenceEntityContract } from './referenceEntity.contract.js';

const id = ReimbursementStatusId.create('00000000-0000-4000-8000-000000000020');

runReferenceEntityContract({
  label: 'ReimbursementStatus',
  create: (args) => ReimbursementStatus.create({ id, ...args }),
  defaults: { name: 'Non-Reimbursable', bgColor: '#e8eaed', textColor: '#000000' },
});

describe('ReimbursementStatus — kind', () => {
  const baseArgs = {
    id,
    name: 'Unpaid Reimbursable',
    bgColor: '#ffe5a0',
    textColor: '#473821',
    displayOrder: 0,
  } as const;

  it("defaults kind to 'NonReimbursable' when omitted", () => {
    const s = ReimbursementStatus.create(baseArgs);
    expect(s.kind).toBe('NonReimbursable');
  });

  it('accepts a valid kind and exposes it', () => {
    const s = ReimbursementStatus.create({ ...baseArgs, kind: 'UnpaidReimbursable' });
    expect(s.kind).toBe('UnpaidReimbursable');
  });

  it('throws on an invalid kind', () => {
    expect(() =>
      // @ts-expect-error — exercising the runtime guard
      ReimbursementStatus.create({ ...baseArgs, kind: 'BogusKind' }),
    ).toThrow(RangeError);
  });

  it('keeps kind stable across rename', () => {
    const s = ReimbursementStatus.create({ ...baseArgs, kind: 'UnpaidReimbursable' });
    s.rename('Outstanding');
    expect(s.name).toBe('Outstanding');
    expect(s.kind).toBe('UnpaidReimbursable');
  });

  it('keeps kind stable across colour changes and archive toggles', () => {
    const s = ReimbursementStatus.create({ ...baseArgs, kind: 'EarlyReimbursement' });
    s.changeColors({ bgColor: '#000000', textColor: '#ffffff' });
    s.archive();
    s.unarchive();
    expect(s.kind).toBe('EarlyReimbursement');
  });
});
