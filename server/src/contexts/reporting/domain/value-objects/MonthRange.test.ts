import { describe, expect, it } from 'vitest';
import { monthRangeFromString } from './MonthRange.js';

describe('monthRangeFromString', () => {
  it('parses a mid-year month into half-open UTC bounds', () => {
    const r = monthRangeFromString('2026-05');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.month).toBe('2026-05');
      expect(r.value.start.toISOString()).toBe('2026-05-01T00:00:00.000Z');
      expect(r.value.end.toISOString()).toBe('2026-06-01T00:00:00.000Z');
    }
  });

  it('rolls over December into the next year', () => {
    const r = monthRangeFromString('2026-12');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.start.toISOString()).toBe('2026-12-01T00:00:00.000Z');
      expect(r.value.end.toISOString()).toBe('2027-01-01T00:00:00.000Z');
    }
  });

  it('handles January', () => {
    const r = monthRangeFromString('2026-01');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.start.toISOString()).toBe('2026-01-01T00:00:00.000Z');
      expect(r.value.end.toISOString()).toBe('2026-02-01T00:00:00.000Z');
    }
  });

  it.each([
    '2026-13',
    '2026-00',
    '26-05',
    '2026/05',
    '2026-5',
    '2026-05-01',
    'not-a-month',
    '',
    '  2026-05  ',
  ])('rejects malformed input %j', (input) => {
    const r = monthRangeFromString(input);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('invalid_month');
  });

  it('rejects an out-of-range year', () => {
    const r = monthRangeFromString('0001-01');
    expect(r.ok).toBe(false);
  });
});
