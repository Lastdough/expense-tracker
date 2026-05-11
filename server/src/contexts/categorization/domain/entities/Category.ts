import { type CategoryId } from '../value-objects/CategoryId.js';

// Reference-data aggregate. Used by Expense to classify what an expense is.
// Per CLAUDE.md: archived, never deleted, because historical expenses
// continue to reference it. Color invariants enforced here; name uniqueness
// is a cross-aggregate concern enforced in the use case via the repository.

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export class Category {
  private constructor(
    public readonly id: CategoryId,
    private _name: string,
    private _bgColor: string,
    private _textColor: string,
    private _isArchived: boolean,
    private _displayOrder: number,
  ) {}

  static create(args: {
    id: CategoryId;
    name: string;
    bgColor: string;
    textColor: string;
    displayOrder: number;
    isArchived?: boolean;
  }): Category {
    const name = Category.assertName(args.name);
    Category.assertHexColor(args.bgColor, 'bgColor');
    Category.assertHexColor(args.textColor, 'textColor');
    Category.assertDisplayOrder(args.displayOrder);
    return new Category(
      args.id,
      name,
      args.bgColor,
      args.textColor,
      args.isArchived ?? false,
      args.displayOrder,
    );
  }

  rename(newName: string): void {
    this._name = Category.assertName(newName);
  }

  changeColors(args: { bgColor: string; textColor: string }): void {
    Category.assertHexColor(args.bgColor, 'bgColor');
    Category.assertHexColor(args.textColor, 'textColor');
    this._bgColor = args.bgColor;
    this._textColor = args.textColor;
  }

  archive(): void {
    this._isArchived = true;
  }

  unarchive(): void {
    this._isArchived = false;
  }

  reorderTo(displayOrder: number): void {
    Category.assertDisplayOrder(displayOrder);
    this._displayOrder = displayOrder;
  }

  get name(): string {
    return this._name;
  }
  get nameNormalized(): string {
    return Category.normalizeName(this._name);
  }
  get bgColor(): string {
    return this._bgColor;
  }
  get textColor(): string {
    return this._textColor;
  }
  get isArchived(): boolean {
    return this._isArchived;
  }
  get displayOrder(): number {
    return this._displayOrder;
  }

  static normalizeName(name: string): string {
    return name.trim().toLowerCase();
  }

  private static assertName(name: string): string {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      throw new RangeError('Category name must not be empty');
    }
    if (trimmed.length > 64) {
      throw new RangeError(`Category name must be ≤ 64 chars; got ${trimmed.length}`);
    }
    return trimmed;
  }

  private static assertHexColor(hex: string, field: string): void {
    if (!HEX_COLOR_RE.test(hex)) {
      throw new RangeError(`${field} must be #rrggbb hex; got "${hex}"`);
    }
  }

  private static assertDisplayOrder(value: number): void {
    if (!Number.isInteger(value) || value < 0) {
      throw new RangeError(`displayOrder must be a non-negative integer; got ${value}`);
    }
  }
}
