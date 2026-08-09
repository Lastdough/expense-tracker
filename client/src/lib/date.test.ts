import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  formatIsoDay,
  formatYmd,
  longDayLabel,
  parseYmd,
  shortDayLabel,
  todayYmd,
  utcYmd,
  ymdFromIso,
  ymdToExclusiveEndIso,
  ymdToIso,
} from './date';

/**
 * These run the same assertions in a positive-offset zone (WIB, where the
 * *write* path broke — local midnight persisted as the previous day at 17:00Z)
 * and a negative-offset zone (where the *read* path breaks — a UTC-midnight
 * instant rendered locally shows the previous day). A helper that is correct in
 * only one of the two is the bug this module was written to remove.
 */
const ZONES = ['UTC', 'Asia/Jakarta', 'America/New_York'] as const;

const originalTz = process.env.TZ;

function inZone(tz: string, fn: () => void): void {
  process.env.TZ = tz;
  try {
    fn();
  } finally {
    process.env.TZ = originalTz;
  }
}

afterEach(() => {
  process.env.TZ = originalTz;
  vi.useRealTimers();
});

describe('parseYmd', () => {
  it('accepts a well-formed day', () => {
    expect(parseYmd('2026-08-01')).toEqual({ y: 2026, m: 8, d: 1 });
  });

  it('rejects malformed input', () => {
    for (const bad of ['', '2026-8-1', '2026/08/01', '2026-08', 'nope', '2026-08-01T00:00:00Z']) {
      expect(parseYmd(bad)).toBeNull();
    }
  });

  it('rejects days that would silently roll over', () => {
    expect(parseYmd('2026-02-30')).toBeNull();
    expect(parseYmd('2026-13-01')).toBeNull();
    expect(parseYmd('2025-02-29')).toBeNull();
    // 2024 is a leap year, so this one is real.
    expect(parseYmd('2024-02-29')).toEqual({ y: 2024, m: 2, d: 29 });
  });
});

describe.each(ZONES)('in %s', (tz) => {
  it('ymdToIso pins a calendar day to midnight UTC', () => {
    inZone(tz, () => {
      // The regression: at WIB this used to produce 2026-07-31T17:00:00.000Z,
      // so the server bucketed an expense dated the 1st into the month before.
      expect(ymdToIso('2026-08-01')).toBe('2026-08-01T00:00:00.000Z');
      expect(ymdToIso('2026-12-31')).toBe('2026-12-31T00:00:00.000Z');
      expect(ymdToIso('2024-02-29')).toBe('2024-02-29T00:00:00.000Z');
    });
  });

  it('ymdFromIso reads the calendar day back in UTC', () => {
    inZone(tz, () => {
      expect(ymdFromIso('2026-08-01T00:00:00.000Z')).toBe('2026-08-01');
      expect(ymdFromIso('2026-08-01T23:59:59.999Z')).toBe('2026-08-01');
    });
  });

  it('round-trips every month boundary', () => {
    inZone(tz, () => {
      for (let m = 1; m <= 12; m++) {
        const first = `2026-${String(m).padStart(2, '0')}-01`;
        expect(ymdFromIso(ymdToIso(first))).toBe(first);
      }
    });
  });

  it('ymdToExclusiveEndIso is the start of the next UTC day', () => {
    inZone(tz, () => {
      expect(ymdToExclusiveEndIso('2026-08-31')).toBe('2026-09-01T00:00:00.000Z');
      expect(ymdToExclusiveEndIso('2026-12-31')).toBe('2027-01-01T00:00:00.000Z');
      expect(ymdToExclusiveEndIso('2024-02-28')).toBe('2024-02-29T00:00:00.000Z');
    });
  });

  it('the exclusive end includes an end-of-day posting under a half-open filter', () => {
    inZone(tz, () => {
      // `asOfEndOfDayIso` writes 23:59:59.999; a `lt` bound of that same instant
      // would exclude it, which is why the end bound is the next day's start.
      const posted = Date.parse('2026-08-31T23:59:59.999Z');
      expect(posted).toBeLessThan(Date.parse(ymdToExclusiveEndIso('2026-08-31')));
    });
  });

  it('utcYmd reads a Date in UTC', () => {
    inZone(tz, () => {
      expect(utcYmd(new Date('2026-08-01T00:00:00.000Z'))).toBe('2026-08-01');
    });
  });

  it('labels format the stored instant in UTC, never the viewer local day', () => {
    inZone(tz, () => {
      const iso = ymdToIso('2026-08-01');
      expect(shortDayLabel(iso)).toBe('Sat 1 Aug');
      expect(longDayLabel(iso)).toBe('Sat, 1 Aug 2026');
      expect(formatYmd('2026-08-01', { day: 'numeric' })).toBe('1');
      expect(formatIsoDay(iso, { day: 'numeric' })).toBe('1');
    });
  });

  it('labels pass malformed input through rather than rendering a wrong day', () => {
    inZone(tz, () => {
      expect(shortDayLabel('not-a-date')).toBe('not-a-date');
      expect(longDayLabel('not-a-date')).toBe('not-a-date');
      expect(formatYmd('2026-02-30', { day: 'numeric' })).toBe('2026-02-30');
    });
  });
});

describe('todayYmd', () => {
  it('follows the local clock — "today" is a human fact, not a UTC one', () => {
    vi.useFakeTimers();
    // 07:30 on 8 Aug in WIB is still 7 Aug in UTC. The user is looking at the
    // 8th, so that is the day the pickers must seed with.
    vi.setSystemTime(new Date('2026-08-08T00:30:00.000Z'));
    inZone('Asia/Jakarta', () => {
      expect(todayYmd()).toBe('2026-08-08');
    });
    // The same instant is still the 7th for a viewer in New York.
    inZone('America/New_York', () => {
      expect(todayYmd()).toBe('2026-08-07');
    });
  });
});
