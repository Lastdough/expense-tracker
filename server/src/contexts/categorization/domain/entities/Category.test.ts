import { describe, expect, it } from 'vitest';
import { Category } from './Category.js';
import { CategoryId } from '../value-objects/CategoryId.js';
import { runReferenceEntityContract } from './referenceEntity.contract.js';

const id = CategoryId.create('00000000-0000-4000-8000-000000000001');

runReferenceEntityContract({
  label: 'Category',
  create: (args) => Category.create({ id, ...args }),
  defaults: { name: 'Food', bgColor: '#ffcfc9', textColor: '#b10202' },
});

describe('Category — entity-specific', () => {
  it('preserves the id passed to create', () => {
    const c = Category.create({
      id,
      name: 'Food',
      bgColor: '#ffcfc9',
      textColor: '#b10202',
      displayOrder: 0,
    });
    expect(c.id).toBe(id);
  });

  it('Category.normalizeName lowercases and trims', () => {
    expect(Category.normalizeName('  Food  ')).toBe('food');
    expect(Category.normalizeName('GROCERIES')).toBe('groceries');
  });
});
