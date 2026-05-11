import { describe, expect, it } from 'vitest';
import { Method } from './Method.js';
import { MethodId } from '../value-objects/MethodId.js';

const id = MethodId.create('00000000-0000-4000-8000-000000000010');

function make(overrides: Partial<Parameters<typeof Method.create>[0]> = {}) {
  return Method.create({
    id,
    name: 'Mandiri',
    bgColor: '#143361',
    textColor: '#a8c0e0',
    displayOrder: 0,
    ...overrides,
  });
}

describe('Method entity', () => {
  it('builds, archives, renames, and reorders like Category', () => {
    const m = make({ name: '  Cash  ' });
    expect(m.name).toBe('Cash');
    expect(m.nameNormalized).toBe('cash');

    m.rename('Mandiri');
    expect(m.name).toBe('Mandiri');

    m.changeColors({ bgColor: '#000000', textColor: '#ffffff' });
    expect(m.bgColor).toBe('#000000');

    m.archive();
    expect(m.isArchived).toBe(true);

    m.unarchive();
    expect(m.isArchived).toBe(false);

    m.reorderTo(5);
    expect(m.displayOrder).toBe(5);
  });

  it('rejects invariants the same way Category does', () => {
    expect(() => make({ name: '' })).toThrow(RangeError);
    expect(() => make({ bgColor: 'red' })).toThrow(RangeError);
    expect(() => make({ textColor: '#fff' })).toThrow(RangeError);
    expect(() => make({ displayOrder: -1 })).toThrow(RangeError);
    const m = make();
    expect(() => m.rename('   ')).toThrow(RangeError);
    expect(() => m.changeColors({ bgColor: 'red', textColor: '#ffffff' })).toThrow(RangeError);
  });
});
