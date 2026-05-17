import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { evaluateFormula } from './formulaEvaluator';
import { ERR_CASES, OK_CASES } from './parity-cases';

describe('evaluateFormula', () => {
  describe('parity cases (must match server FormulaEvaluator byte-for-byte)', () => {
    for (const { input, decimals, expected } of OK_CASES) {
      it(`${JSON.stringify(input)} @ decimals=${decimals} → ${expected}n`, () => {
        const result = evaluateFormula(input, decimals);
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.amountMinor).toBe(expected);
      });
    }
    for (const { input, decimals, reason } of ERR_CASES) {
      it(`${JSON.stringify(input)} @ decimals=${decimals} → ${reason}`, () => {
        const result = evaluateFormula(input, decimals);
        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.reason).toBe(reason);
      });
    }
  });

  describe('return shape', () => {
    it('returns bigint minor units for IDR (decimals=0)', () => {
      const r = evaluateFormula('100000', 0);
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(typeof r.amountMinor).toBe('bigint');
      expect(r.amountMinor).toBe(100000n);
    });

    it('returns bigint minor units for USD (decimals=2)', () => {
      const r = evaluateFormula('100', 2);
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.amountMinor).toBe(10000n);
    });

    it('error result carries reason and message', () => {
      const r = evaluateFormula('1/0', 0);
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.reason).toBe('divide-by-zero');
      expect(r.message).toMatch(/division/i);
    });
  });

  describe('security guarantee (source-level)', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(join(here, 'formulaEvaluator.ts'), 'utf-8');

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
