import { describe, expect, it } from 'vitest';
import { findClosestName } from './findClosestName.js';

describe('findClosestName', () => {
  const seedCategories = ['Food', 'Transportations', 'Shopping', 'Bill', 'Healthcare', 'Misc'];

  it('returns exact match (case-insensitive)', () => {
    expect(findClosestName('food', seedCategories)).toBe('Food');
  });

  it('returns one-edit-away match', () => {
    expect(findClosestName('Foods', seedCategories)).toBe('Food');
  });

  it('returns two-edit-away match', () => {
    expect(findClosestName('Healtcare', seedCategories)).toBe('Healthcare');
  });

  it('returns null when no candidate is close enough (relative bound)', () => {
    // BCA → seed has no method like it; with relative bound for length 3, ≥2 edits is far.
    expect(findClosestName('xyz', seedCategories)).toBeNull();
  });

  it('returns null when nothing matches at all', () => {
    expect(findClosestName('Hello', ['Coffee', 'Tea'])).toBeNull();
  });

  it('returns null for empty query', () => {
    expect(findClosestName('', seedCategories)).toBeNull();
  });

  it('returns null when candidates list is empty', () => {
    expect(findClosestName('Food', [])).toBeNull();
  });

  it('preserves original casing of returned candidate', () => {
    expect(findClosestName('healtcare', seedCategories)).toBe('Healthcare');
  });
});
