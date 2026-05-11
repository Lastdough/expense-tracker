import { type MethodId } from '../value-objects/MethodId.js';

// Payment method (Mandiri, Cash, Gopay, ...). Reference-data aggregate;
// structurally identical to Category — kept concrete rather than abstracted
// so each context's invariants stay easy to read at the entity.

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export class Method {
  private constructor(
    public readonly id: MethodId,
    private _name: string,
    private _bgColor: string,
    private _textColor: string,
    private _isArchived: boolean,
    private _displayOrder: number,
  ) {}

  static create(args: {
    id: MethodId;
    name: string;
    bgColor: string;
    textColor: string;
    displayOrder: number;
    isArchived?: boolean;
  }): Method {
    const name = Method.assertName(args.name);
    Method.assertHexColor(args.bgColor, 'bgColor');
    Method.assertHexColor(args.textColor, 'textColor');
    Method.assertDisplayOrder(args.displayOrder);
    return new Method(
      args.id,
      name,
      args.bgColor,
      args.textColor,
      args.isArchived ?? false,
      args.displayOrder,
    );
  }

  rename(newName: string): void {
    this._name = Method.assertName(newName);
  }

  changeColors(args: { bgColor: string; textColor: string }): void {
    Method.assertHexColor(args.bgColor, 'bgColor');
    Method.assertHexColor(args.textColor, 'textColor');
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
    Method.assertDisplayOrder(displayOrder);
    this._displayOrder = displayOrder;
  }

  get name(): string {
    return this._name;
  }
  get nameNormalized(): string {
    return Method.normalizeName(this._name);
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
      throw new RangeError('Method name must not be empty');
    }
    if (trimmed.length > 64) {
      throw new RangeError(`Method name must be ≤ 64 chars; got ${trimmed.length}`);
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
