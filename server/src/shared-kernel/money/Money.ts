import { CURRENCIES, type Currency } from './Currency.js';

/**
 * Money value object. Internally stores the amount as a bigint in the
 * currency's minor units (e.g. cents for USD, rupiah for IDR which has no
 * subdivision). All arithmetic is exact — never use number for money.
 *
 * Currency mismatch in arithmetic throws CurrencyMismatchError. That's a
 * programmer error: you should never write code that adds USD to EUR
 * implicitly. Currency conversion is an explicit, separate concern.
 */
export class Money {
  private constructor(
    private readonly _amount: bigint,
    private readonly _currency: Currency,
  ) {}

  static fromMinor(amount: bigint | number, currency: Currency): Money {
    if (typeof amount === 'number') {
      if (!Number.isSafeInteger(amount)) {
        throw new TypeError(
          `Money.fromMinor: amount must be a safe integer (got ${amount}). Use bigint for large values.`,
        );
      }
      return new Money(BigInt(amount), currency);
    }
    return new Money(amount, currency);
  }

  /**
   * Parses a decimal string in major units (e.g. "1234.50" USD = 123450 cents).
   * Strict: rejects malformed input, scientific notation, and fraction lengths
   * exceeding the currency's minor-units exponent.
   */
  static fromMajor(amount: string, currency: Currency): Money {
    const meta = CURRENCIES[currency];
    const trimmed = amount.trim();
    if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
      throw new RangeError(`Money.fromMajor: invalid numeric string "${amount}"`);
    }
    const negative = trimmed.startsWith('-');
    const body = negative ? trimmed.slice(1) : trimmed;
    const dotIndex = body.indexOf('.');
    const whole = dotIndex === -1 ? body : body.slice(0, dotIndex);
    const fraction = dotIndex === -1 ? '' : body.slice(dotIndex + 1);
    if (fraction.length > meta.minorUnits) {
      throw new RangeError(
        `Money.fromMajor: ${currency} allows at most ${meta.minorUnits} fractional digits, got "${fraction}"`,
      );
    }
    const padded = fraction.padEnd(meta.minorUnits, '0');
    const minor = BigInt(whole + padded);
    return new Money(negative ? -minor : minor, currency);
  }

  static zero(currency: Currency): Money {
    return new Money(0n, currency);
  }

  get amount(): bigint {
    return this._amount;
  }

  get currency(): Currency {
    return this._currency;
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this._amount + other._amount, this._currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this._amount - other._amount, this._currency);
  }

  multiply(scalar: bigint | number): Money {
    let factor: bigint;
    if (typeof scalar === 'number') {
      if (!Number.isInteger(scalar)) {
        throw new TypeError(
          `Money.multiply: scalar must be an integer (got ${scalar}). Non-integer multipliers must be expressed as a ratio.`,
        );
      }
      factor = BigInt(scalar);
    } else {
      factor = scalar;
    }
    return new Money(this._amount * factor, this._currency);
  }

  negate(): Money {
    return new Money(-this._amount, this._currency);
  }

  abs(): Money {
    return new Money(this._amount < 0n ? -this._amount : this._amount, this._currency);
  }

  equals(other: Money): boolean {
    return this._currency === other._currency && this._amount === other._amount;
  }

  compare(other: Money): -1 | 0 | 1 {
    this.assertSameCurrency(other);
    if (this._amount < other._amount) return -1;
    if (this._amount > other._amount) return 1;
    return 0;
  }

  isZero(): boolean {
    return this._amount === 0n;
  }

  isPositive(): boolean {
    return this._amount > 0n;
  }

  isNegative(): boolean {
    return this._amount < 0n;
  }

  /** Returns the amount as a decimal string in major units (no symbol, no separators). */
  toMajor(): string {
    const meta = CURRENCIES[this._currency];
    const negative = this._amount < 0n;
    const abs = negative ? -this._amount : this._amount;
    const str = abs.toString();
    if (meta.minorUnits === 0) {
      return (negative ? '-' : '') + str;
    }
    const padded = str.padStart(meta.minorUnits + 1, '0');
    const whole = padded.slice(0, -meta.minorUnits);
    const fraction = padded.slice(-meta.minorUnits);
    return (negative ? '-' : '') + whole + '.' + fraction;
  }

  toString(): string {
    return `Money(${this.toMajor()} ${this._currency})`;
  }

  private assertSameCurrency(other: Money): void {
    if (this._currency !== other._currency) {
      throw new CurrencyMismatchError(this._currency, other._currency);
    }
  }
}

export class CurrencyMismatchError extends Error {
  constructor(
    public readonly left: Currency,
    public readonly right: Currency,
  ) {
    super(`Cannot operate on Money values with different currencies: ${left} vs ${right}`);
    this.name = 'CurrencyMismatchError';
    Object.setPrototypeOf(this, CurrencyMismatchError.prototype);
  }
}
