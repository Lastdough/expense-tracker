import { type ReimbursementStatusId } from '../value-objects/ReimbursementStatusId.js';
import {
  isReimbursementStatusKind,
  type ReimbursementStatusKind,
} from '../value-objects/ReimbursementStatusKind.js';

// Reimbursement status menu (Non-Reimbursable, Unpaid Reimbursable, ...).
// The actual state-machine behavior lives in the `reimbursements` bounded
// context as a value object — this aggregate is just the catalog the UI
// pulls names + colors from. `kind` is the stable discriminator the
// reimbursements context maps to its ReimbursementState; immutable after
// creation so user renames in Settings can't break that mapping.

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export class ReimbursementStatus {
  private constructor(
    public readonly id: ReimbursementStatusId,
    private _name: string,
    private _bgColor: string,
    private _textColor: string,
    private _isArchived: boolean,
    private _displayOrder: number,
    public readonly kind: ReimbursementStatusKind,
  ) {}

  static create(args: {
    id: ReimbursementStatusId;
    name: string;
    bgColor: string;
    textColor: string;
    displayOrder: number;
    isArchived?: boolean;
    kind?: ReimbursementStatusKind;
  }): ReimbursementStatus {
    const name = ReimbursementStatus.assertName(args.name);
    ReimbursementStatus.assertHexColor(args.bgColor, 'bgColor');
    ReimbursementStatus.assertHexColor(args.textColor, 'textColor');
    ReimbursementStatus.assertDisplayOrder(args.displayOrder);
    const kind = args.kind ?? 'NonReimbursable';
    if (!isReimbursementStatusKind(kind)) {
      throw new RangeError(`ReimbursementStatus kind invalid; got "${String(kind)}"`);
    }
    return new ReimbursementStatus(
      args.id,
      name,
      args.bgColor,
      args.textColor,
      args.isArchived ?? false,
      args.displayOrder,
      kind,
    );
  }

  rename(newName: string): void {
    this._name = ReimbursementStatus.assertName(newName);
  }

  changeColors(args: { bgColor: string; textColor: string }): void {
    ReimbursementStatus.assertHexColor(args.bgColor, 'bgColor');
    ReimbursementStatus.assertHexColor(args.textColor, 'textColor');
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
    ReimbursementStatus.assertDisplayOrder(displayOrder);
    this._displayOrder = displayOrder;
  }

  get name(): string {
    return this._name;
  }
  get nameNormalized(): string {
    return ReimbursementStatus.normalizeName(this._name);
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
      throw new RangeError('ReimbursementStatus name must not be empty');
    }
    if (trimmed.length > 64) {
      throw new RangeError(`ReimbursementStatus name must be ≤ 64 chars; got ${trimmed.length}`);
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
