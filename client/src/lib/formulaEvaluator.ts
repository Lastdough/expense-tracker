// Client-side port of the daily-driver Amount-field formula evaluator.
//
// The single source of truth for grammar + semantics is:
//   server/src/contexts/expenses/domain/services/FormulaEvaluator.ts
// When that file changes, update this file AND
//   client/src/lib/formulaEvaluator.test.ts (parity-cases).
// Both must agree byte-for-byte on input → minor-unit output.
//
// Differences vs. server:
//   - Takes `decimals: number` (the currency's minor-unit count) instead of a
//     Currency enum, because the client doesn't carry a currency registry.
//   - Returns a discriminated union so the live Quick-Add display can render
//     "= invalid" on every partial keystroke without throwing.
//   - Returns `amountMinor: bigint` directly; the consumer formats it.

const EXTRA_PRECISION = 6;
const ALLOWED = /^[0-9+\-*/().\t\n\r ]*$/;

export type FormulaErrorReason =
  | 'empty'
  | 'whitelist'
  | 'parse'
  | 'divide-by-zero'
  | 'precision';

export type FormulaResult =
  | { readonly ok: true; readonly amountMinor: bigint }
  | { readonly ok: false; readonly reason: FormulaErrorReason; readonly message: string };

export function evaluateFormula(input: string, decimals: number): FormulaResult {
  let source = input.trim();
  if (source.startsWith('=')) source = source.slice(1).trim();
  if (source.length === 0) {
    return { ok: false, reason: 'empty', message: 'Formula is empty.' };
  }
  if (!ALLOWED.test(source)) {
    return {
      ok: false,
      reason: 'whitelist',
      message: 'Formula contains characters outside the allowed set [0-9 + - * / ( ) . whitespace].',
    };
  }

  const internalDecimals = decimals + EXTRA_PRECISION;
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

  function parseExpr(): FormulaResult {
    const first = parseTerm();
    if (!first.ok) return first;
    let left = first.amountMinor;
    while (true) {
      const c = current();
      if (c !== '+' && c !== '-') break;
      consume();
      const right = parseTerm();
      if (!right.ok) return right;
      left = c === '+' ? left + right.amountMinor : left - right.amountMinor;
    }
    return { ok: true, amountMinor: left };
  }

  function parseTerm(): FormulaResult {
    const first = parseFactor();
    if (!first.ok) return first;
    let left = first.amountMinor;
    while (true) {
      const c = current();
      if (c !== '*' && c !== '/') break;
      consume();
      const right = parseFactor();
      if (!right.ok) return right;
      if (c === '*') {
        left = roundDiv(left * right.amountMinor, scale);
      } else {
        if (right.amountMinor === 0n) {
          return { ok: false, reason: 'divide-by-zero', message: 'Division by zero.' };
        }
        left = roundDiv(left * scale, right.amountMinor);
      }
    }
    return { ok: true, amountMinor: left };
  }

  function parseFactor(): FormulaResult {
    if (current() === '-') {
      consume();
      const inner = parseFactor();
      if (!inner.ok) return inner;
      return { ok: true, amountMinor: -inner.amountMinor };
    }
    return parsePrimary();
  }

  function parsePrimary(): FormulaResult {
    const c = current();
    if (c === '(') {
      consume();
      const inner = parseExpr();
      if (!inner.ok) return inner;
      if (current() !== ')') {
        return { ok: false, reason: 'parse', message: `Expected ')' at position ${pos}.` };
      }
      consume();
      return inner;
    }
    return parseNumber();
  }

  function parseNumber(): FormulaResult {
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
        return { ok: false, reason: 'parse', message: `Expected number at position ${start}.` };
      }
    } else if (start === wholeEnd) {
      const seen = pos < len ? `'${source[pos]}'` : 'end-of-input';
      return {
        ok: false,
        reason: 'parse',
        message: `Expected number at position ${start}, got ${seen}.`,
      };
    }
    const whole = source.slice(start, wholeEnd) || '0';
    const frac = hasDot ? source.slice(wholeEnd + 1, fracEnd) : '';
    if (frac.length > internalDecimals) {
      return {
        ok: false,
        reason: 'precision',
        message: `Number "${source.slice(start, pos)}" has ${frac.length} fractional digits; max ${internalDecimals} allowed during evaluation.`,
      };
    }
    const padded = frac.padEnd(internalDecimals, '0');
    return { ok: true, amountMinor: BigInt(whole + padded) };
  }

  const result = parseExpr();
  if (!result.ok) return result;
  while (pos < len && isWhitespace(source[pos]!)) pos++;
  if (pos < len) {
    return { ok: false, reason: 'parse', message: `Unexpected '${source[pos]}' at position ${pos}.` };
  }

  return { ok: true, amountMinor: roundDiv(result.amountMinor, extraScale) };
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
