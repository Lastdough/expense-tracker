import { describe, expect, it } from 'vitest';
import { Category } from './Category.js';
import { CategoryId } from '../value-objects/CategoryId.js';

const id = CategoryId.create('00000000-0000-4000-8000-000000000001');

function make(overrides: Partial<Parameters<typeof Category.create>[0]> = {}) {
  return Category.create({
    id,
    name: 'Food',
    bgColor: '#ffcfc9',
    textColor: '#b10202',
    displayOrder: 0,
    ...overrides,
  });
}

describe('Category.create', () => {
  it('builds a category with all fields', () => {
    const c = make();
    expect(c.id).toBe(id);
    expect(c.name).toBe('Food');
    expect(c.bgColor).toBe('#ffcfc9');
    expect(c.textColor).toBe('#b10202');
    expect(c.displayOrder).toBe(0);
    expect(c.isArchived).toBe(false);
  });

  it('trims whitespace around the name', () => {
    const c = make({ name: '  Food  ' });
    expect(c.name).toBe('Food');
  });

  it('exposes nameNormalized as lowercased trimmed name', () => {
    const c = make({ name: '  FOOD  ' });
    expect(c.nameNormalized).toBe('food');
  });

  it('throws on empty name', () => {
    expect(() => make({ name: '' })).toThrow(RangeError);
    expect(() => make({ name: '   ' })).toThrow(RangeError);
  });

  it('throws on name longer than 64 chars', () => {
    expect(() => make({ name: 'a'.repeat(65) })).toThrow(RangeError);
  });

  it('throws on malformed bgColor', () => {
    expect(() => make({ bgColor: 'red' })).toThrow(RangeError);
    expect(() => make({ bgColor: '#fff' })).toThrow(RangeError); // 3-digit not allowed
    expect(() => make({ bgColor: '#fffffff' })).toThrow(RangeError); // too long
    expect(() => make({ bgColor: '#zzzzzz' })).toThrow(RangeError);
  });

  it('throws on malformed textColor', () => {
    expect(() => make({ textColor: 'black' })).toThrow(RangeError);
  });

  it('throws on negative or non-integer displayOrder', () => {
    expect(() => make({ displayOrder: -1 })).toThrow(RangeError);
    expect(() => make({ displayOrder: 1.5 })).toThrow(RangeError);
    expect(() => make({ displayOrder: Number.NaN })).toThrow(RangeError);
  });

  it('accepts isArchived true', () => {
    const c = make({ isArchived: true });
    expect(c.isArchived).toBe(true);
  });
});

describe('Category.rename', () => {
  it('updates the name and trims whitespace', () => {
    const c = make();
    c.rename('  Groceries  ');
    expect(c.name).toBe('Groceries');
  });

  it('throws on empty new name', () => {
    const c = make();
    expect(() => c.rename('')).toThrow(RangeError);
    expect(() => c.rename('   ')).toThrow(RangeError);
  });
});

describe('Category.changeColors', () => {
  it('updates both colors', () => {
    const c = make();
    c.changeColors({ bgColor: '#000000', textColor: '#ffffff' });
    expect(c.bgColor).toBe('#000000');
    expect(c.textColor).toBe('#ffffff');
  });

  it('throws if either color is malformed', () => {
    const c = make();
    expect(() => c.changeColors({ bgColor: 'red', textColor: '#ffffff' })).toThrow(RangeError);
    expect(() => c.changeColors({ bgColor: '#000000', textColor: 'white' })).toThrow(RangeError);
  });
});

describe('Category.archive / unarchive', () => {
  it('toggles isArchived', () => {
    const c = make();
    expect(c.isArchived).toBe(false);
    c.archive();
    expect(c.isArchived).toBe(true);
    c.unarchive();
    expect(c.isArchived).toBe(false);
  });

  it('archive is idempotent', () => {
    const c = make({ isArchived: true });
    c.archive();
    expect(c.isArchived).toBe(true);
  });
});

describe('Category.reorderTo', () => {
  it('updates displayOrder', () => {
    const c = make();
    c.reorderTo(7);
    expect(c.displayOrder).toBe(7);
  });

  it('throws on negative or non-integer', () => {
    const c = make();
    expect(() => c.reorderTo(-1)).toThrow(RangeError);
    expect(() => c.reorderTo(0.5)).toThrow(RangeError);
  });
});

describe('Category.normalizeName', () => {
  it('lowercases and trims', () => {
    expect(Category.normalizeName('  Food  ')).toBe('food');
    expect(Category.normalizeName('GROCERIES')).toBe('groceries');
  });
});
