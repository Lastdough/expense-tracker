import { describe, expect, it } from 'vitest';

import {
  addDays,
  buildGrid,
  fromIso,
  isSameDay,
  rangeLabel,
  rangePresets,
  smartLabel,
  toIso,
} from './DatePicker';

describe('DatePicker · pure helpers', () => {
  describe('toIso / fromIso', () => {
    it('round-trips a local date through YYYY-MM-DD', () => {
      const d = new Date(2026, 4, 11); // 11 May 2026 local
      expect(toIso(d)).toBe('2026-05-11');
      const back = fromIso('2026-05-11');
      expect(back).not.toBeNull();
      expect(back!.getFullYear()).toBe(2026);
      expect(back!.getMonth()).toBe(4);
      expect(back!.getDate()).toBe(11);
    });

    it('zero-pads month and day', () => {
      expect(toIso(new Date(2026, 0, 3))).toBe('2026-01-03');
    });

    it('returns empty string for null', () => {
      expect(toIso(null)).toBe('');
    });

    it('returns null for empty / malformed input', () => {
      expect(fromIso('')).toBeNull();
      expect(fromIso(null)).toBeNull();
      expect(fromIso('not-a-date')).toBeNull();
      expect(fromIso('2026-05')).toBeNull();
    });
  });

  describe('isSameDay', () => {
    it('true when same Y/M/D regardless of time', () => {
      const a = new Date(2026, 4, 11, 9, 30);
      const b = new Date(2026, 4, 11, 22, 0);
      expect(isSameDay(a, b)).toBe(true);
    });

    it('false across midnight', () => {
      expect(isSameDay(new Date(2026, 4, 11), new Date(2026, 4, 12))).toBe(false);
    });

    it('false when either is null', () => {
      expect(isSameDay(null, new Date())).toBe(false);
      expect(isSameDay(new Date(), null)).toBe(false);
      expect(isSameDay(null, null)).toBe(false);
    });
  });

  describe('addDays', () => {
    it('moves forward', () => {
      expect(toIso(addDays(new Date(2026, 4, 11), 5))).toBe('2026-05-16');
    });

    it('moves backward', () => {
      expect(toIso(addDays(new Date(2026, 4, 11), -11))).toBe('2026-04-30');
    });

    it('crosses month and year boundaries', () => {
      expect(toIso(addDays(new Date(2026, 11, 31), 1))).toBe('2027-01-01');
      expect(toIso(addDays(new Date(2026, 0, 1), -1))).toBe('2025-12-31');
    });
  });

  describe('smartLabel', () => {
    it('collapses to "Today · …" for today', () => {
      const t = new Date();
      const today0 = new Date(t.getFullYear(), t.getMonth(), t.getDate());
      expect(smartLabel(today0).startsWith('Today · ')).toBe(true);
    });

    it('uses "Yesterday" and "Tomorrow" for ±1 day', () => {
      const t = new Date();
      const today0 = new Date(t.getFullYear(), t.getMonth(), t.getDate());
      expect(smartLabel(addDays(today0, -1)).startsWith('Yesterday · ')).toBe(true);
      expect(smartLabel(addDays(today0, 1)).startsWith('Tomorrow · ')).toBe(true);
    });

    it('uses full DOW name for distant dates', () => {
      const t = new Date();
      const today0 = new Date(t.getFullYear(), t.getMonth(), t.getDate());
      const future = addDays(today0, 30);
      const label = smartLabel(future);
      // Has a comma and isn't a today/yesterday/tomorrow tag
      expect(label.includes(', ')).toBe(true);
      expect(label.startsWith('Today')).toBe(false);
      expect(label.startsWith('Yesterday')).toBe(false);
      expect(label.startsWith('Tomorrow')).toBe(false);
    });

    it('returns placeholder for null', () => {
      expect(smartLabel(null, 'Pick a date')).toBe('Pick a date');
    });
  });

  describe('rangeLabel', () => {
    it('placeholder when empty', () => {
      expect(rangeLabel({ start: null, end: null }, 'All dates')).toBe('All dates');
    });

    it('compact form when same month', () => {
      const r = { start: new Date(2026, 4, 1), end: new Date(2026, 4, 11) };
      const label = rangeLabel(r);
      expect(label.includes('1–11 May')).toBe(true);
    });

    it('two-month form when different months, same year', () => {
      const r = { start: new Date(2026, 3, 25), end: new Date(2026, 4, 11) };
      const label = rangeLabel(r);
      expect(label.includes('25 Apr')).toBe(true);
      expect(label.includes('11 May')).toBe(true);
    });
  });

  describe('rangePresets', () => {
    it('returns 9 entries with custom last', () => {
      const now = new Date(2026, 4, 11);
      const presets = rangePresets(now);
      expect(presets.length).toBe(9);
      const last = presets[presets.length - 1]!;
      expect(last.id).toBe('custom');
      expect(last.start).toBeNull();
    });

    it('YTD starts on Jan 1 of the year', () => {
      const now = new Date(2026, 4, 11);
      const ytd = rangePresets(now).find((p) => p.id === 'ytd');
      expect(ytd?.start?.getMonth()).toBe(0);
      expect(ytd?.start?.getDate()).toBe(1);
    });

    it('last-30 spans 30 inclusive days', () => {
      const now = new Date(2026, 4, 11);
      const p = rangePresets(now).find((p) => p.id === 'last-30')!;
      const diff = (p.end!.getTime() - p.start!.getTime()) / (1000 * 60 * 60 * 24);
      expect(Math.round(diff)).toBe(29);
    });
  });

  describe('buildGrid', () => {
    it('always returns 42 cells (6 weeks × 7 days)', () => {
      expect(buildGrid(new Date(2026, 1, 1)).length).toBe(42); // 28-day Feb
      expect(buildGrid(new Date(2026, 4, 1)).length).toBe(42); // 31-day May
    });

    it('first cell is on the chosen week start', () => {
      const sunStart = buildGrid(new Date(2026, 4, 1), 0);
      expect(sunStart[0]!.getDay()).toBe(0);
      const monStart = buildGrid(new Date(2026, 4, 1), 1);
      expect(monStart[0]!.getDay()).toBe(1);
    });
  });
});
