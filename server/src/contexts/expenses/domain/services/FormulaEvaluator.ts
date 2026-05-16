import { Money } from '../../../../shared-kernel/money/Money.js';
import { CURRENCIES, type Currency } from '../../../../shared-kernel/money/Currency.js';
import { ok, err, type Result } from '../../../../shared-kernel/result/Result.js';
import {
  EmptyFormulaError,
  InvalidCharacterError,
  FormulaSyntaxError,
  DivisionByZeroError,
  NumberPrecisionError,
  type FormulaError,
} from '../errors/FormulaErrors.js';

const EXTRA_PRECISION = 6;
const ALLOWED = /^[0-9+\-*/().\t\n\r ]*$/;

/**
 * Hand-rolled recursive-descent evaluator for the daily-driver Amount field.
 *
 * Grammar:
 *   expr := term (('+' | '-') term)*
 *   term: = factor (('*' | '/') factor)*
 *   factor: = '-' factor | primary
 *   primary: = number | '(' expr ')'
 *
 * All arithmetic happens in bigint at the currency's minor-units precision
 * plus an extra 6 digits of headroom, then rounded half-away-from-zero down
 * to the currency at the end. This deliberately avoids eval / Function / vm —
 * the security guarantee is that the only characters the parser ever sees
 * are those in the ALLOWED whitelist, and the only operation it ever performs
 * is bigint arithmetic.
 */
export function evaluateFormula(
  input: string,
  currency: Currency,
): Result<Money, FormulaError> {
  let source = input.trim();
  if (source.startsWith('=')) source = source.slice(1).trim();
  if (source.length === 0) return err(new EmptyFormulaError('Formula is empty.'));
  if (!ALLOWED.test(source)) {
    return err(
      new InvalidCharacterError(
        'Formula contains characters outside the allowed set [0-9 + - * / ( ) . whitespace].',
      ),
    );
  }

  const meta = CURRENCIES[currency];
  const internalDecimals = meta.minorUnits + EXTRA_PRECISION;
  const scale = 10n ** BigInt(internalDecimals);
  const extraScale = 10n ** BigInt(EXTRA_PRECISION);

  let pos = 0;
  const len = source.length;

  function current(): string {
    while (pos < len && isWhitespace(source[pos]!)) pos++;
    return pos < len ? source[pos]! : '';
  }

  function consume(): void {
    pos++;
  }

  function parseExpr(): Result<bigint, FormulaError> {
    const first = parseTerm();
    if (!first.ok) return first;
    let left = first.value;
    while (true) {
      const c = current();
      if (c !== '+' && c !== '-') break;
      consume();
      const right = parseTerm();
      if (!right.ok) return right;
      left = c === '+' ? left + right.value : left - right.value;
    }
    return ok(left);
  }

  function parseTerm(): Result<bigint, FormulaError> {
    const first = parseFactor();
    if (!first.ok) return first;
    let left = first.value;
    while (true) {
      const c = current();
      if (c !== '*' && c !== '/') break;
      consume();
      const right = parseFactor();
      if (!right.ok) return right;
      if (c === '*') {
        left = roundDiv(left * right.value, scale);
      } else {
        if (right.value === 0n) {
          return err(new DivisionByZeroError('Division by zero.'));
        }
        left = roundDiv(left * scale, right.value);
      }
    }
    return ok(left);
  }

  function parseFactor(): Result<bigint, FormulaError> {
    if (current() === '-') {
      consume();
      const inner = parseFactor();
      if (!inner.ok) return inner;
      return ok(-inner.value);
    }
    return parsePrimary();
  }

  function parsePrimary(): Result<bigint, FormulaError> {
    const c = current();
    if (c === '(') {
      consume();
      const inner = parseExpr();
      if (!inner.ok) return inner;
      if (current() !== ')') {
        return err(new FormulaSyntaxError(`Expected ')' at position ${pos}.`));
      }
      consume();
      return inner;
    }
    return parseNumber();
  }

  function parseNumber(): Result<bigint, FormulaError> {
    current();
    const start = pos;
    while (pos < len && isDigit(source[pos]!)) pos++;
    const wholeEnd = pos;
    let hasDot = false;
    let fracEnd = pos;
    if (pos < len && source[pos] === '.') {
      hasDot = true;
      pos++;
      const fracStart = pos;
      while (pos < len && isDigit(source[pos]!)) pos++;
      fracEnd = pos;
      if (fracStart === fracEnd && start === wholeEnd) {
        return err(new FormulaSyntaxError(`Expected number at position ${start}.`));
      }
    } else if (start === wholeEnd) {
      const seen = pos < len ? `'${source[pos]}'` : 'end-of-input';
      return err(new FormulaSyntaxError(`Expected number at position ${start}, got ${seen}.`));
    }
    const whole = source.slice(start, wholeEnd) || '0';
    const frac = hasDot ? source.slice(wholeEnd + 1, fracEnd) : '';
    if (frac.length > internalDecimals) {
      return err(
        new NumberPrecisionError(
          `Number "${source.slice(start, pos)}" has ${frac.length} fractional digits; ${currency} allows at most ${internalDecimals} during evaluation.`,
        ),
      );
    }
    const padded = frac.padEnd(internalDecimals, '0');
    return ok(BigInt(whole + padded));
  }

  const result = parseExpr();
  if (!result.ok) return result;
  while (pos < len && isWhitespace(source[pos]!)) pos++;
  if (pos < len) {
    return err(new FormulaSyntaxError(`Unexpected '${source[pos]}' at position ${pos}.`));
  }

  const minor = roundDiv(result.value, extraScale);
  return ok(Money.fromMinor(minor, currency));
}

function isDigit(c: string): boolean {
  return c >= '0' && c <= '9';
}

function isWhitespace(c: string): boolean {
  return c === ' ' || c === '\t' || c === '\n' || c === '\r';
}

function roundDiv(numerator: bigint, denominator: bigint): bigint {
  const neg = (numerator < 0n) !== (denominator < 0n);
  const absN = numerator < 0n ? -numerator : numerator;
  const absD = denominator < 0n ? -denominator : denominator;
  const q = absN / absD;
  const r = absN % absD;
  const rounded = r * 2n >= absD ? q + 1n : q;
  return neg ? -rounded : rounded;
}
