// Currency display helpers for the client. The client never does money
// arithmetic — the server's Money VO is authoritative; we only format.

const ZERO_DECIMAL_CURRENCIES = new Set(['IDR', 'JPY', 'KRW', 'VND', 'CLP', 'XAF', 'XOF']);

// Pin a canonical locale per currency so number separators don't drift with
// the host machine. IDR is the only currency we ship with today (CLAUDE.md);
// a future Settings option will let the user override these.
const CURRENCY_LOCALES: Record<string, string> = {
  IDR: 'id-ID', // 1.234.567 — period thousands, comma decimal
  JPY: 'ja-JP',
  KRW: 'ko-KR',
  VND: 'vi-VN',
  USD: 'en-US',
  EUR: 'de-DE',
  GBP: 'en-GB',
};

export function currencyDecimals(currency: string): number {
  return ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase()) ? 0 : 2;
}

export function currencyLocale(currency: string): string | undefined {
  return CURRENCY_LOCALES[currency.toUpperCase()];
}

/** Formats a minor-unit amount (e.g. 100000 IDR or 12345 USD-cents) as a localized currency string. */
export function formatMoney(args: {
  amountMinor: bigint | number | string;
  currency: string;
}): string {
  const decimals = currencyDecimals(args.currency);
  const minor = toBigInt(args.amountMinor);
  const major = bigintToMajorNumber(minor, decimals);
  return new Intl.NumberFormat(currencyLocale(args.currency), {
    style: 'currency',
    currency: args.currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(major);
}

/**
 * Converts a minor-unit amount to a plain decimal string (no separators) suitable
 * as a form input value — e.g. IDR 100000 → "100000", USD 12345 → "123.45".
 * Use this for editor fallbacks: the formula evaluator accepts plain digits and
 * `.` as a decimal point, but trips on locale separators or currency symbols.
 */
export function minorToDecimalString(
  amountMinor: bigint | number | string,
  currency: string,
): string {
  const decimals = currencyDecimals(currency);
  const minor = toBigInt(amountMinor);
  if (decimals === 0) return minor.toString();
  const negative = minor < 0n;
  const abs = negative ? -minor : minor;
  const divisor = 10n ** BigInt(decimals);
  const whole = abs / divisor;
  const frac = (abs % divisor).toString().padStart(decimals, '0');
  return `${negative ? '-' : ''}${whole}.${frac}`;
}

/** Formats a decimal-string major amount (e.g. "5000000") without a currency symbol. */
export function formatMajor(major: string, currency: string): string {
  const decimals = currencyDecimals(currency);
  const n = Number(major);
  if (!Number.isFinite(n)) return major;
  return new Intl.NumberFormat(currencyLocale(currency), {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

/**
 * Returns the locale's group (thousands) separator character for the currency
 * — e.g. `.` for IDR (id-ID), `,` for USD (en-US). Used by `extractRawAmount`
 * to strip separators before handing the string to the formula evaluator or
 * to the server, both of which expect plain decimal strings.
 */
export function thousandSeparator(currency: string): string {
  const parts = new Intl.NumberFormat(currencyLocale(currency)).formatToParts(12345);
  return parts.find((p) => p.type === 'group')?.value ?? ',';
}

/**
 * Formats a free-text amount as the user types — `"100000"` → `"100.000"` for
 * IDR. Formulas (anything starting with `=`) pass through unchanged: the user
 * is in expression mode and inserting thousand separators would break their
 * intent (`=10.000*5` would parse `10.000` as a decimal in IDR).
 *
 * Only IDR's 0-decimal case is fully wired today (the only currency we ship).
 * For 2-decimal currencies the helper returns plain digits, no separators —
 * good enough until USD/EUR actually need attention. The currency parameter
 * keeps the future-extension seam in place.
 */
export function formatAmountInput(raw: string, currency: string): string {
  if (raw.startsWith('=')) return raw;
  const digits = raw.replace(/[^\d]/g, '');
  if (digits.length === 0) return '';
  if (currencyDecimals(currency) === 0) {
    return new Intl.NumberFormat(currencyLocale(currency)).format(BigInt(digits));
  }
  // TODO multi-decimal currencies: needs decimal-point detection in the raw
  // string. IDR is the only currency we ship with; ship USD/EUR support when
  // they actually land in Settings.
  return digits;
}

/**
 * Strips locale thousand separators from a displayed amount to recover the
 * plain decimal string the formula evaluator and server expect. Formulas pass
 * through unchanged.
 */
export function extractRawAmount(displayed: string, currency: string): string {
  if (displayed.startsWith('=')) return displayed;
  const sep = thousandSeparator(currency);
  // Escape regex metachars in the separator (`.` is one — important for IDR).
  const escaped = sep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return displayed.replace(new RegExp(escaped, 'g'), '');
}

function toBigInt(value: bigint | number | string): bigint {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') return BigInt(Math.trunc(value));
  return BigInt(value);
}

// Converts minor-unit bigint to a JS number for Intl formatting.
// Safe up to ~9e15 (Number.MAX_SAFE_INTEGER) — well past any realistic personal-finance amount.
function bigintToMajorNumber(minor: bigint, decimals: number): number {
  if (decimals === 0) return Number(minor);
  const divisor = 10n ** BigInt(decimals);
  const whole = minor / divisor;
  const frac = minor < 0n ? -minor % divisor : minor % divisor;
  const sign = minor < 0n ? -1 : 1;
  return sign * (Number(whole < 0n ? -whole : whole) + Number(frac) / Number(divisor));
}
