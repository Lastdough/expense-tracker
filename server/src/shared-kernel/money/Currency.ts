export const CURRENCY_CODES = ['IDR', 'USD', 'EUR', 'JPY', 'GBP', 'SGD', 'AUD'] as const;

export type Currency = (typeof CURRENCY_CODES)[number];

export interface CurrencyMeta {
  readonly code: Currency;
  readonly minorUnits: number;
  readonly symbol: string;
  readonly name: string;
}

export const CURRENCIES: Record<Currency, CurrencyMeta> = {
  IDR: { code: 'IDR', minorUnits: 0, symbol: 'Rp', name: 'Indonesian Rupiah' },
  USD: { code: 'USD', minorUnits: 2, symbol: '$', name: 'US Dollar' },
  EUR: { code: 'EUR', minorUnits: 2, symbol: '€', name: 'Euro' },
  JPY: { code: 'JPY', minorUnits: 0, symbol: '¥', name: 'Japanese Yen' },
  GBP: { code: 'GBP', minorUnits: 2, symbol: '£', name: 'Pound Sterling' },
  SGD: { code: 'SGD', minorUnits: 2, symbol: 'S$', name: 'Singapore Dollar' },
  AUD: { code: 'AUD', minorUnits: 2, symbol: 'A$', name: 'Australian Dollar' },
};

export const DEFAULT_CURRENCY: Currency = 'IDR';

export function isCurrency(value: string): value is Currency {
  return (CURRENCY_CODES as readonly string[]).includes(value);
}
