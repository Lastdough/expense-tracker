/**
 * Calendar-day primitives. One rule, and it is the rule the server already
 * follows (`reporting/domain/value-objects/MonthRange.ts`,
 * `expenses/application/services/SheetsRowParser.ts`):
 *
 *   A transaction date is a **calendar day**, and its canonical instant is
 *   **midnight UTC** of that day.
 *
 * The only thing allowed to read the local clock is "what day is it for the
 * human sitting here right now" — `todayYmd` and `currentMonthString`. Anything
 * *derived* from a `YYYY-MM-DD` or `YYYY-MM` label is built and read in UTC.
 *
 * Mixing the two is the bug this module exists to prevent. At WIB (UTC+7)
 * `new Date(y, m - 1, d).toISOString()` persists the *previous* day at 17:00Z,
 * so the server buckets an expense dated the 1st into the month before — while
 * the client, reading the same instant back with local getters, still renders
 * it as the 1st.
 */

const DOW_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

const YMD_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parsed calendar day, or null when `ymd` is malformed or would roll over. */
export function parseYmd(ymd: string): { y: number; m: number; d: number } | null {
  const match = YMD_RE.exec(ymd);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  // Reject values Date.UTC would silently roll over (e.g. 2026-02-30), the same
  // guard the server's asOfExclusiveBound applies.
  const probe = new Date(Date.UTC(y, m - 1, d));
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== m - 1 || probe.getUTCDate() !== d) {
    return null;
  }
  return { y, m, d };
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** The calendar day a `Date` falls on, read in UTC. */
export function utcYmd(d: Date): string {
  return `${String(d.getUTCFullYear()).padStart(4, '0')}-${pad2(d.getUTCMonth() + 1)}-${pad2(
    d.getUTCDate(),
  )}`;
}

/**
 * Today for the person using the app — read from the **local** clock, because
 * "today" is a human fact, not a UTC one. The result is a plain label; every
 * instant derived from it is UTC.
 */
export function todayYmd(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

/** Midnight UTC of `ymd` — the canonical instant for that calendar day. */
export function ymdToIso(ymd: string): string {
  const p = parseYmd(ymd);
  if (!p) return ymdToIso(todayYmd());
  return new Date(Date.UTC(p.y, p.m - 1, p.d)).toISOString();
}

/**
 * Midnight UTC of the day *after* `ymd`. Every range query on the server is
 * half-open (`gte: start, lt: end`), so this is the correct upper bound for
 * "through `ymd`, inclusive" — not 23:59:59.999, which drops anything posted at
 * exactly that instant (which is precisely what `asOfEndOfDayIso` writes).
 */
export function ymdToExclusiveEndIso(ymd: string): string {
  const p = parseYmd(ymd);
  if (!p) return ymdToExclusiveEndIso(todayYmd());
  return new Date(Date.UTC(p.y, p.m - 1, p.d + 1)).toISOString();
}

/** The calendar day a stored instant belongs to, read in UTC. */
export function ymdFromIso(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return todayYmd();
  return utcYmd(d);
}

/** `Sun 3 Aug` — for a stored instant. */
export function shortDayLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${DOW_SHORT[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS_SHORT[d.getUTCMonth()]}`;
}

/** `Sun, 3 Aug 2026` — for a stored instant. */
export function longDayLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${DOW_SHORT[d.getUTCDay()]}, ${d.getUTCDate()} ${
    MONTHS_SHORT[d.getUTCMonth()]
  } ${d.getUTCFullYear()}`;
}

/**
 * Locale-formatted calendar day. `timeZone: 'UTC'` is not optional here — the
 * instant is a UTC midnight, so formatting it in any negative-offset zone would
 * render the previous day.
 */
export function formatYmd(ymd: string, options: Intl.DateTimeFormatOptions): string {
  const p = parseYmd(ymd);
  if (!p) return ymd;
  return new Date(Date.UTC(p.y, p.m - 1, p.d)).toLocaleDateString(undefined, {
    ...options,
    timeZone: 'UTC',
  });
}

/** As `formatYmd`, but taking a stored instant. */
export function formatIsoDay(iso: string, options: Intl.DateTimeFormatOptions): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { ...options, timeZone: 'UTC' });
}
