import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { Money } from '../../../../shared-kernel/money/Money.js';
import {
  DivisionByZeroError,
  EmptyFormulaError,
  FormulaSyntaxError,
  InvalidCharacterError,
  NumberPrecisionError,
} from '../errors/FormulaErrors.js';
import { evaluateFormula } from './FormulaEvaluator.js';

function unwrap(input: string, currency: 'IDR' | 'USD' = 'IDR'): Money {
  const result = evaluateFormula(input, currency);
  if (!result.ok) {
    throw new Error(`evaluateFormula failed: ${result.error.code} — ${result.error.message}`);
  }
  return result.value;
}

function failWith<T>(input: string, errorType: new (...args: never[]) => T, currency: 'IDR' | 'USD' = 'IDR'): T {
  const result = evaluateFormula(input, currency);
  if (result.ok) {
    throw new Error(`expected error but got value ${result.value.toMajor()}`);
  }
  expect(result.error).toBeInstanceOf(errorType);
  return result.error as T;
}

describe('evaluateFormula', () => {
  describe('result type', () => {
    it('returns a Money instance with the requested currency', () => {
      const result = evaluateFormula('100', 'USD');
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value).toBeInstanceOf(Money);
      expect(result.value.currency).toBe('USD');
      expect(result.value.amount).toBe(10000n);
    });

    it('returns IDR amounts in integer minor units (no subdivision)', () => {
      const m = unwrap('100000', 'IDR');
      expect(m.amount).toBe(100000n);
      expect(m.currency).toBe('IDR');
    });
  });

  describe('simple arithmetic', () => {
    it('adds', () => {
      expect(unwrap('1+2').amount).toBe(3n);
    });
    it('subtracts', () => {
      expect(unwrap('10-3').amount).toBe(7n);
    });
    it('multiplies', () => {
      expect(unwrap('4*5').amount).toBe(20n);
    });
    it('divides', () => {
      expect(unwrap('20/4').amount).toBe(5n);
    });
    it('handles the canonical formulas from CLAUDE.md', () => {
      expect(unwrap('=20000*5').amount).toBe(100000n);
      expect(unwrap('=99000-81000').amount).toBe(18000n);
    });
  });

  describe('precedence and parentheses', () => {
    it('respects multiplication-over-addition', () => {
      expect(unwrap('2+3*4').amount).toBe(14n);
    });
    it('honors parentheses', () => {
      expect(unwrap('(2+3)*4').amount).toBe(20n);
    });
    it('handles nested parentheses', () => {
      expect(unwrap('((1+2)*(3+4))').amount).toBe(21n);
      expect(unwrap('(1+(2*(3+4)))').amount).toBe(15n);
    });
    it('chains operators left-to-right', () => {
      expect(unwrap('100-50-25').amount).toBe(25n);
      expect(unwrap('100/5/2').amount).toBe(10n);
    });
  });

  describe('unary minus', () => {
    it('negates a single number', () => {
      expect(unwrap('-5').amount).toBe(-5n);
    });
    it('negates an expression', () => {
      expect(unwrap('-(2+3)').amount).toBe(-5n);
    });
    it('double-negates back to positive', () => {
      expect(unwrap('--5').amount).toBe(5n);
    });
    it('works in the middle of an expression', () => {
      expect(unwrap('1*-2').amount).toBe(-2n);
      expect(unwrap('1+-2').amount).toBe(-1n);
      expect(unwrap('10-(-5)').amount).toBe(15n);
    });
  });

  describe('whitespace tolerance', () => {
    it('ignores spaces around operators and operands', () => {
      expect(unwrap('  20000  *  5  ').amount).toBe(100000n);
    });
    it('ignores tabs and newlines', () => {
      expect(unwrap('\t1\t+\t2\t').amount).toBe(3n);
      expect(unwrap('1\n+\n2').amount).toBe(3n);
      expect(unwrap('1\r\n+\r\n2').amount).toBe(3n);
    });
  });

  describe('leading =', () => {
    it('strips a single leading = with no padding', () => {
      expect(unwrap('=10+5').amount).toBe(15n);
    });
    it('strips a single leading = with surrounding whitespace', () => {
      expect(unwrap('  =  10+5  ').amount).toBe(15n);
    });
    it('treats bare = as empty', () => {
      failWith('=', EmptyFormulaError);
      failWith('=   ', EmptyFormulaError);
    });
    it('rejects a second = (whitelist violation)', () => {
      failWith('==5', InvalidCharacterError);
      failWith('5=5', InvalidCharacterError);
    });
  });

  describe('empty input', () => {
    it('rejects empty strings', () => {
      failWith('', EmptyFormulaError);
    });
    it('rejects whitespace-only strings', () => {
      failWith('   ', EmptyFormulaError);
      failWith('\t\n', EmptyFormulaError);
    });
  });

  describe('IDR precision (0 minor units)', () => {
    it('rounds 100000/3 half-away-from-zero', () => {
      expect(unwrap('100000/3', 'IDR').amount).toBe(33333n);
    });
    it('allows decimal literals as multipliers', () => {
      expect(unwrap('100*1.5', 'IDR').amount).toBe(150n);
      expect(unwrap('100*0.07', 'IDR').amount).toBe(7n);
    });
    it('rounds half-away-from-zero at the final step', () => {
      expect(unwrap('100.5', 'IDR').amount).toBe(101n);
      expect(unwrap('100.4', 'IDR').amount).toBe(100n);
      expect(unwrap('-100.5', 'IDR').amount).toBe(-101n);
    });
    it('rejects more fractional digits than internal precision allows', () => {
      failWith('0.0000001', NumberPrecisionError, 'IDR');
    });
  });

  describe('USD precision (2 minor units)', () => {
    it('sums fractional dollars exactly', () => {
      expect(unwrap('1.50+0.25', 'USD').amount).toBe(175n);
    });
    it('pads short fractions to the currency width', () => {
      expect(unwrap('1.5', 'USD').amount).toBe(150n);
      expect(unwrap('1', 'USD').amount).toBe(100n);
    });
    it('rounds 10/3 to two minor units', () => {
      expect(unwrap('10/3', 'USD').amount).toBe(333n);
    });
    it('rejects more fractional digits than internal precision allows', () => {
      failWith('0.000000001', NumberPrecisionError, 'USD');
    });
  });

  describe('number literal edge cases', () => {
    it('accepts leading-dot decimals', () => {
      expect(unwrap('.5+.5', 'USD').amount).toBe(100n);
    });
    it('accepts trailing-dot decimals', () => {
      expect(unwrap('5.+0', 'USD').amount).toBe(500n);
    });
    it('rejects a lone dot', () => {
      failWith('.', FormulaSyntaxError);
    });
    it('handles very large bigints without overflow', () => {
      const m = unwrap('9999999999*9999999999', 'IDR');
      expect(m).toBeInstanceOf(Money);
      expect(m.amount).toBe(9999999999n * 9999999999n);
    });
  });

  describe('malicious / out-of-grammar inputs', () => {
    const cases = [
      'process.exit(1)',
      'require("fs")',
      '__proto__',
      'constructor',
      '1; alert(1)',
      '1+1//comment',
      '`code`',
      '${x}',
      'eval("1+1")',
      '0x10',
      '1e3',
      '0b1',
      "console.log('hi')",
      '1[0]',
      'a+b',
    ];
    for (const input of cases) {
      it(`rejects ${JSON.stringify(input)} as InvalidCharacterError`, () => {
        failWith(input, InvalidCharacterError);
      });
    }
  });

  describe('Unicode rejection', () => {
    const cases: Array<[string, string]> = [
      ['full-width digits', '１２３'],
      ['Arabic-Indic digits', '١+٢'],
      ['Devanagari digits', '१+२'],
      ['em space', '1 2'],
      ['non-breaking space', '1 + 2'],
      ['zero-width joiner', '1‍+2'],
      ['RTL mark', '1‏+2'],
      ['fullwidth plus', '1＋2'],
    ];
    for (const [label, input] of cases) {
      it(`rejects ${label}`, () => {
        failWith(input, InvalidCharacterError);
      });
    }
  });

  describe('syntax errors', () => {
    const cases: Array<[string, string]> = [
      ['trailing +', '1+'],
      ['leading * with no operand', '*3'],
      ['unmatched open paren', '(1+2'],
      ['unmatched close paren', '1+2)'],
      ['empty parens', '()'],
      ['double + (no unary plus)', '1++2'],
      ['adjacent numbers', '1 2'],
      ['trailing operator', '1+2+'],
      ['operator at start', '/5'],
      ['paren after no operator', '1(2)'],
    ];
    for (const [label, input] of cases) {
      it(`rejects ${label}: ${JSON.stringify(input)}`, () => {
        failWith(input, FormulaSyntaxError);
      });
    }
  });

  describe('division by zero', () => {
    it('rejects /0', () => {
      failWith('1/0', DivisionByZeroError);
    });
    it('rejects /(expression that resolves to zero)', () => {
      failWith('1/(2-2)', DivisionByZeroError);
    });
    it('rejects /0.0 in USD', () => {
      failWith('1/0.00', DivisionByZeroError, 'USD');
    });
    it('rejects /0.000000 in IDR (within internal precision)', () => {
      failWith('1/0.000000', DivisionByZeroError, 'IDR');
    });
  });

  describe('security guarantee (source-level)', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(join(here, 'FormulaEvaluator.ts'), 'utf-8');

    it('contains no eval() call', () => {
      expect(source).not.toMatch(/\beval\s*\(/);
    });
    it('contains no Function constructor invocation', () => {
      expect(source).not.toMatch(/\bnew\s+Function\s*\(/);
      expect(source).not.toMatch(/(?<!\w)Function\s*\(/);
    });
    it('does not import or use the vm module', () => {
      expect(source).not.toMatch(/['"]node:vm['"]/);
      expect(source).not.toMatch(/\bvm\.(runIn|createContext|compileFunction)/);
    });
  });
});
