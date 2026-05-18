import type { Currency } from './Currency.js';
import { CURRENCIES } from './Currency.js';
import { Money } from './Money.js';

/**
 * Display formatting for `Money`. Lives outside the `Money` value object so the
 * domain stays pure — formatting is an application/interfaces concern that may
 * eventually be parameterised by a user-chosen locale (see `Settings`).
 *
 * The locale map below is the seed default; when a `Settings` aggregate ships
 * with a per-user locale preference, this lookup is the one place to swap.
 * The client mirrors this exact map in `client/src/lib/money.ts`.
 */

const CURRENCY_LOCALES: Record<Currency, string> = {
  IDR: 'id-ID', // 1.234.567 — period thousands, comma decimal
  JPY: 'ja-JP',
  USD: 'en-US',
  EUR: 'de-DE',
  GBP: 'en-GB',
  SGD: 'en-SG',
  AUD: 'en-AU',
};

export function currencyLocale(currency: Currency): string {
  return CURRENCY_LOCALES[currency];
}

/**
 * Human-readable currency string with the locale's native thousands / decimal
 * separators — e.g. `Rp 1.234.567` (IDR), `1.234,56 €` (EUR), `$1,234.56` (USD).
 *
 * Negative amounts render with the locale's native negative-sign convention
 * (typically a leading `-`). The exact whitespace between the symbol and the
 * digits is locale + ICU dependent; tests should not match on whitespace bytes.
 */
export function formatMoney(money: Money): string {
  const meta = CURRENCIES[money.currency];
  return new Intl.NumberFormat(currencyLocale(money.currency), {
    style: 'currency',
    currency: money.currency,
    minimumFractionDigits: meta.minorUnits,
    maximumFractionDigits: meta.minorUnits,
  }).format(Number(money.toMajor()));
}

/**
 * Formats a decimal-string major amount as a localized **number** (no currency
 * symbol). Used by renderers that already render the symbol separately.
 */
export function formatMajor(major: string, currency: Currency): string {
  const meta = CURRENCIES[currency];
  const n = Number(major);
  if (!Number.isFinite(n)) return major;
  return new Intl.NumberFormat(currencyLocale(currency), {
    minimumFractionDigits: meta.minorUnits,
    maximumFractionDigits: meta.minorUnits,
  }).format(n);
}
