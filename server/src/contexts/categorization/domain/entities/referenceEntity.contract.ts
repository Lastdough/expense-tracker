import { describe, expect, it } from 'vitest';

/**
 * Shared invariant contract for reference-data entities (Category, Method,
 * ReimbursementStatus). All three share the same name/color/archive/order
 * shape with identical validation rules; this contract proves a given entity
 * satisfies that shared contract without duplicating per-entity test files.
 *
 * Call once per entity from its `<Entity>.test.ts` file with an EntitySpec.
 */

interface ReferenceLike {
  readonly name: string;
  readonly nameNormalized: string;
  readonly bgColor: string;
  readonly textColor: string;
  readonly isArchived: boolean;
  readonly displayOrder: number;
  rename(name: string): void;
  changeColors(args: { bgColor: string; textColor: string }): void;
  archive(): void;
  unarchive(): void;
  reorderTo(displayOrder: number): void;
}

interface CreateArgs {
  readonly name: string;
  readonly bgColor: string;
  readonly textColor: string;
  readonly displayOrder: number;
  readonly isArchived?: boolean;
}

export interface EntitySpec<T extends ReferenceLike> {
  readonly label: string;
  readonly create: (args: CreateArgs) => T;
  readonly defaults: { readonly name: string; readonly bgColor: string; readonly textColor: string };
}

export function runReferenceEntityContract<T extends ReferenceLike>(spec: EntitySpec<T>): void {
  const make = (overrides: Partial<CreateArgs> = {}): T =>
    spec.create({ ...spec.defaults, displayOrder: 0, ...overrides });

  describe(`${spec.label} — reference-entity contract`, () => {
    describe('create', () => {
      it('builds with all fields', () => {
        const e = make();
        expect(e.name).toBe(spec.defaults.name);
        expect(e.bgColor).toBe(spec.defaults.bgColor);
        expect(e.textColor).toBe(spec.defaults.textColor);
        expect(e.displayOrder).toBe(0);
        expect(e.isArchived).toBe(false);
      });

      it('trims whitespace around the name', () => {
        const e = make({ name: `  ${spec.defaults.name}  ` });
        expect(e.name).toBe(spec.defaults.name);
      });

      it('exposes nameNormalized as lowercased trimmed name', () => {
        const e = make({ name: `  ${spec.defaults.name.toUpperCase()}  ` });
        expect(e.nameNormalized).toBe(spec.defaults.name.toLowerCase());
      });

      it('throws on empty name', () => {
        expect(() => make({ name: '' })).toThrow(RangeError);
        expect(() => make({ name: '   ' })).toThrow(RangeError);
      });

      it('throws on name longer than 64 chars', () => {
        expect(() => make({ name: 'a'.repeat(65) })).toThrow(RangeError);
      });

      it('throws on malformed bgColor', () => {
        expect(() => make({ bgColor: 'red' })).toThrow(RangeError);
        expect(() => make({ bgColor: '#fff' })).toThrow(RangeError);
        expect(() => make({ bgColor: '#fffffff' })).toThrow(RangeError);
        expect(() => make({ bgColor: '#zzzzzz' })).toThrow(RangeError);
      });

      it('throws on malformed textColor', () => {
        expect(() => make({ textColor: 'black' })).toThrow(RangeError);
      });

      it('throws on negative or non-integer displayOrder', () => {
        expect(() => make({ displayOrder: -1 })).toThrow(RangeError);
        expect(() => make({ displayOrder: 1.5 })).toThrow(RangeError);
        expect(() => make({ displayOrder: Number.NaN })).toThrow(RangeError);
      });

      it('accepts isArchived true', () => {
        const e = make({ isArchived: true });
        expect(e.isArchived).toBe(true);
      });
    });

    describe('rename', () => {
      it('updates the name and trims whitespace', () => {
        const e = make();
        e.rename('  Renamed  ');
        expect(e.name).toBe('Renamed');
      });

      it('throws on empty new name', () => {
        const e = make();
        expect(() => e.rename('')).toThrow(RangeError);
        expect(() => e.rename('   ')).toThrow(RangeError);
      });
    });

    describe('changeColors', () => {
      it('updates both colors', () => {
        const e = make();
        e.changeColors({ bgColor: '#000000', textColor: '#ffffff' });
        expect(e.bgColor).toBe('#000000');
        expect(e.textColor).toBe('#ffffff');
      });

      it('throws if either color is malformed', () => {
        const e = make();
        expect(() => e.changeColors({ bgColor: 'red', textColor: '#ffffff' })).toThrow(RangeError);
        expect(() => e.changeColors({ bgColor: '#000000', textColor: 'white' })).toThrow(RangeError);
      });
    });

    describe('archive / unarchive', () => {
      it('toggles isArchived', () => {
        const e = make();
        expect(e.isArchived).toBe(false);
        e.archive();
        expect(e.isArchived).toBe(true);
        e.unarchive();
        expect(e.isArchived).toBe(false);
      });

      it('archive is idempotent', () => {
        const e = make({ isArchived: true });
        e.archive();
        expect(e.isArchived).toBe(true);
      });
    });

    describe('reorderTo', () => {
      it('updates displayOrder', () => {
        const e = make();
        e.reorderTo(7);
        expect(e.displayOrder).toBe(7);
      });

      it('throws on negative or non-integer', () => {
        const e = make();
        expect(() => e.reorderTo(-1)).toThrow(RangeError);
        expect(() => e.reorderTo(0.5)).toThrow(RangeError);
      });
    });
  });
}
