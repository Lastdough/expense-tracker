import { http } from './http';
import type {
  CategoryView,
  ChangeColorsInput,
  CreateInput,
  MethodView,
  ReferenceView,
  ReimbursementStatusView,
  RenameInput,
  ReorderInput,
} from './types';

export type ReferenceKind = 'categories' | 'methods' | 'reimbursement-statuses';

export interface ReferenceApi<T extends ReferenceView> {
  readonly list: (opts?: { includeArchived?: boolean }) => Promise<T[]>;
  readonly create: (input: CreateInput) => Promise<T>;
  readonly rename: (id: string, input: RenameInput) => Promise<T>;
  readonly changeColors: (id: string, input: ChangeColorsInput) => Promise<T>;
  readonly archive: (id: string) => Promise<T>;
  readonly unarchive: (id: string) => Promise<T>;
  readonly reorder: (input: ReorderInput) => Promise<T[]>;
}

function makeApi<T extends ReferenceView>(base: ReferenceKind): ReferenceApi<T> {
  const root = `/api/${base}`;
  return {
    list: (opts) =>
      http.get<T[]>(`${root}${opts?.includeArchived ? '?includeArchived=true' : ''}`),
    create: (input) => http.post<T>(root, input),
    rename: (id, input) => http.patch<T>(`${root}/${id}/name`, input),
    changeColors: (id, input) => http.patch<T>(`${root}/${id}/colors`, input),
    archive: (id) => http.post<T>(`${root}/${id}/archive`),
    unarchive: (id) => http.post<T>(`${root}/${id}/unarchive`),
    reorder: (input) => http.post<T[]>(`${root}/reorder`, input),
  };
}

export const categoriesApi = makeApi<CategoryView>('categories');
export const methodsApi = makeApi<MethodView>('methods');
export const statusesApi = makeApi<ReimbursementStatusView>('reimbursement-statuses');
