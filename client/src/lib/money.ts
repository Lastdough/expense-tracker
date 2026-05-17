// Currency display helpers for the client. The client never does money
// arithmetic — the server's Money VO is authoritative; we only format.

const ZERO_DECIMAL_CURRENCIES = new Set(['IDR', 'JPY', 'KRW', 'VND', 'CLP', 'XAF', 'XOF']);

export function currencyDecimals(currency: string): number {
  return ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase()) ? 0 : 2;
}

/** Formats a minor-unit amount (e.g. 100000 IDR or 12345 USD-cents) as a localized currency string. */
export function formatMoney(args: {
  amountMinor: bigint | number | string;
  currency: string;
}): string {
  const decimals = currencyDecimals(args.currency);
  const minor = toBigInt(args.amountMinor);
  const major = bigintToMajorNumber(minor, decimals);
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: args.currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(major);
}

/** Formats a decimal-string major amount (e.g. "5000000") without a currency symbol. */
export function formatMajor(major: string, currency: string): string {
  const decimals = currencyDecimals(currency);
  const n = Number(major);
  if (!Number.isFinite(n)) return major;
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
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
