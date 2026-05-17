// Fixture inputs/outputs shared by formulaEvaluator.test.ts (client) and
// mirrored by the server's FormulaEvaluator.test.ts. The two suites must agree:
// if the server changes a result, this file changes, the client test runs, and
// the discrepancy fails the build.
//
// Most cases use IDR (decimals=0). USD cases (decimals=2) are noted inline.

import type { FormulaErrorReason } from './formulaEvaluator';

export interface OkCase {
  readonly input: string;
  readonly decimals: number;
  readonly expected: bigint;
}

export interface ErrCase {
  readonly input: string;
  readonly decimals: number;
  readonly reason: FormulaErrorReason;
}

export const OK_CASES: readonly OkCase[] = [
  // simple arithmetic
  { input: '1+2', decimals: 0, expected: 3n },
  { input: '10-3', decimals: 0, expected: 7n },
  { input: '4*5', decimals: 0, expected: 20n },
  { input: '20/4', decimals: 0, expected: 5n },

  // canonical CLAUDE.md examples
  { input: '=20000*5', decimals: 0, expected: 100000n },
  { input: '=99000-81000', decimals: 0, expected: 18000n },

  // precedence and parentheses
  { input: '2+3*4', decimals: 0, expected: 14n },
  { input: '(2+3)*4', decimals: 0, expected: 20n },
  { input: '((1+2)*(3+4))', decimals: 0, expected: 21n },
  { input: '(1+(2*(3+4)))', decimals: 0, expected: 15n },
  { input: '100-50-25', decimals: 0, expected: 25n },
  { input: '100/5/2', decimals: 0, expected: 10n },

  // unary minus
  { input: '-5', decimals: 0, expected: -5n },
  { input: '-(2+3)', decimals: 0, expected: -5n },
  { input: '--5', decimals: 0, expected: 5n },
  { input: '1*-2', decimals: 0, expected: -2n },
  { input: '1+-2', decimals: 0, expected: -1n },
  { input: '10-(-5)', decimals: 0, expected: 15n },

  // whitespace tolerance
  { input: '  20000  *  5  ', decimals: 0, expected: 100000n },
  { input: '\t1\t+\t2\t', decimals: 0, expected: 3n },
  { input: '1\n+\n2', decimals: 0, expected: 3n },
  { input: '1\r\n+\r\n2', decimals: 0, expected: 3n },

  // leading =
  { input: '=10+5', decimals: 0, expected: 15n },
  { input: '  =  10+5  ', decimals: 0, expected: 15n },

  // IDR precision (0 minor units): half-away-from-zero rounding
  { input: '100000/3', decimals: 0, expected: 33333n },
  { input: '100*1.5', decimals: 0, expected: 150n },
  { input: '100*0.07', decimals: 0, expected: 7n },
  { input: '100.5', decimals: 0, expected: 101n },
  { input: '100.4', decimals: 0, expected: 100n },
  { input: '-100.5', decimals: 0, expected: -101n },

  // USD precision (2 minor units)
  { input: '1.50+0.25', decimals: 2, expected: 175n },
  { input: '1.5', decimals: 2, expected: 150n },
  { input: '1', decimals: 2, expected: 100n },
  { input: '10/3', decimals: 2, expected: 333n },
  { input: '.5+.5', decimals: 2, expected: 100n },
  { input: '5.+0', decimals: 2, expected: 500n },

  // large bigints don't overflow
  { input: '9999999999*9999999999', decimals: 0, expected: 9999999999n * 9999999999n },
];

export const ERR_CASES: readonly ErrCase[] = [
  // empty
  { input: '', decimals: 0, reason: 'empty' },
  { input: '   ', decimals: 0, reason: 'empty' },
  { input: '\t\n', decimals: 0, reason: 'empty' },
  { input: '=', decimals: 0, reason: 'empty' },
  { input: '=   ', decimals: 0, reason: 'empty' },

  // whitelist (malicious / out-of-grammar / Unicode tricks)
  { input: '==5', decimals: 0, reason: 'whitelist' },
  { input: '5=5', decimals: 0, reason: 'whitelist' },
  { input: 'process.exit(1)', decimals: 0, reason: 'whitelist' },
  { input: 'require("fs")', decimals: 0, reason: 'whitelist' },
  { input: '__proto__', decimals: 0, reason: 'whitelist' },
  { input: 'constructor', decimals: 0, reason: 'whitelist' },
  { input: '1; alert(1)', decimals: 0, reason: 'whitelist' },
  { input: '1+1//comment', decimals: 0, reason: 'whitelist' },
  { input: '`code`', decimals: 0, reason: 'whitelist' },
  { input: '${x}', decimals: 0, reason: 'whitelist' },
  { input: 'eval("1+1")', decimals: 0, reason: 'whitelist' },
  { input: '0x10', decimals: 0, reason: 'whitelist' },
  { input: '1e3', decimals: 0, reason: 'whitelist' },
  { input: '0b1', decimals: 0, reason: 'whitelist' },
  { input: '１２３', decimals: 0, reason: 'whitelist' }, // full-width digits
  { input: '١+٢', decimals: 0, reason: 'whitelist' }, // Arabic-Indic
  { input: '१+२', decimals: 0, reason: 'whitelist' }, // Devanagari
  { input: '1 2', decimals: 0, reason: 'whitelist' }, // em space
  { input: '1 + 2', decimals: 0, reason: 'whitelist' }, // non-breaking space
  { input: '1‍+2', decimals: 0, reason: 'whitelist' }, // zero-width joiner
  { input: '1＋2', decimals: 0, reason: 'whitelist' }, // fullwidth plus

  // parse / syntax
  { input: '1+', decimals: 0, reason: 'parse' },
  { input: '*3', decimals: 0, reason: 'parse' },
  { input: '(1+2', decimals: 0, reason: 'parse' },
  { input: '1+2)', decimals: 0, reason: 'parse' },
  { input: '()', decimals: 0, reason: 'parse' },
  { input: '1++2', decimals: 0, reason: 'parse' },
  { input: '/5', decimals: 0, reason: 'parse' },
  { input: '.', decimals: 0, reason: 'parse' },

  // divide-by-zero
  { input: '1/0', decimals: 0, reason: 'divide-by-zero' },
  { input: '1/(2-2)', decimals: 0, reason: 'divide-by-zero' },
  { input: '1/0.00', decimals: 2, reason: 'divide-by-zero' },
  { input: '1/0.000000', decimals: 0, reason: 'divide-by-zero' },

  // precision
  { input: '0.0000001', decimals: 0, reason: 'precision' },
  { input: '0.000000001', decimals: 2, reason: 'precision' },
];
