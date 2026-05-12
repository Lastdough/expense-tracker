export interface CategoryView {
  readonly id: string;
  readonly name: string;
  readonly bgColor: string;
  readonly textColor: string;
  readonly isArchived: boolean;
  readonly displayOrder: number;
}

export interface MethodView {
  readonly id: string;
  readonly name: string;
  readonly bgColor: string;
  readonly textColor: string;
  readonly isArchived: boolean;
  readonly displayOrder: number;
}

export interface ReimbursementStatusView {
  readonly id: string;
  readonly name: string;
  readonly bgColor: string;
  readonly textColor: string;
  readonly isArchived: boolean;
  readonly displayOrder: number;
}

export type ReferenceView = CategoryView | MethodView | ReimbursementStatusView;

export interface CreateInput {
  readonly name: string;
  readonly bgColor: string;
  readonly textColor: string;
}

export interface RenameInput {
  readonly name: string;
}

export interface ChangeColorsInput {
  readonly bgColor: string;
  readonly textColor: string;
}

export interface ReorderInput {
  readonly ids: ReadonlyArray<string>;
}
