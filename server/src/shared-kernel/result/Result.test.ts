import { describe, expect, it } from 'vitest';
import { err, flatMap, isErr, isOk, map, mapErr, match, ok, type Result } from './Result.js';

describe('Result', () => {
  describe('constructors', () => {
    it('ok wraps a value', () => {
      const r = ok(42);
      expect(r).toEqual({ ok: true, value: 42 });
    });

    it('err wraps an error', () => {
      const r = err('boom');
      expect(r).toEqual({ ok: false, error: 'boom' });
    });
  });

  describe('isOk / isErr', () => {
    it('narrows to ok branch', () => {
      const r: Result<number, string> = ok(1);
      expect(isOk(r)).toBe(true);
      expect(isErr(r)).toBe(false);
      if (isOk(r)) {
        // type-level: r.value is number
        expect(r.value).toBe(1);
      }
    });

    it('narrows to err branch', () => {
      const r: Result<number, string> = err('bad');
      expect(isOk(r)).toBe(false);
      expect(isErr(r)).toBe(true);
      if (isErr(r)) {
        expect(r.error).toBe('bad');
      }
    });
  });

  describe('map', () => {
    it('transforms ok values', () => {
      const r = map(ok(2), (x) => x * 3);
      expect(r).toEqual(ok(6));
    });

    it('passes errors through unchanged', () => {
      const original: Result<number, string> = err('nope');
      const r = map(original, (x) => x * 3);
      expect(r).toEqual(err('nope'));
    });
  });

  describe('mapErr', () => {
    it('transforms errors', () => {
      const r = mapErr(err('low'), (e) => e.toUpperCase());
      expect(r).toEqual(err('LOW'));
    });

    it('passes ok values through unchanged', () => {
      const r = mapErr(ok(5), (e: string) => e.toUpperCase());
      expect(r).toEqual(ok(5));
    });
  });

  describe('flatMap', () => {
    it('chains successful Results', () => {
      const r = flatMap(ok(3), (x) => ok(x + 1));
      expect(r).toEqual(ok(4));
    });

    it('short-circuits on err', () => {
      const original: Result<number, string> = err('halt');
      const r = flatMap(original, (x) => ok(x + 1));
      expect(r).toEqual(err('halt'));
    });

    it('propagates downstream err', () => {
      const r = flatMap(ok(3), (_x) => err<string>('downstream'));
      expect(r).toEqual(err('downstream'));
    });
  });

  describe('match', () => {
    it('routes to ok handler', () => {
      const out = match(ok(10), {
        ok: (v) => `value:${v}`,
        err: (_e: string) => 'unreachable',
      });
      expect(out).toBe('value:10');
    });

    it('routes to err handler', () => {
      const out = match<number, string, string>(err('x'), {
        ok: (v) => `value:${v}`,
        err: (e) => `error:${e}`,
      });
      expect(out).toBe('error:x');
    });
  });
});
