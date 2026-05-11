import { type Request, type Response } from 'express';
import { type CreateCategory } from '../../../application/use-cases/CreateCategory.js';
import { type RenameCategory } from '../../../application/use-cases/RenameCategory.js';
import { type ChangeCategoryColors } from '../../../application/use-cases/ChangeCategoryColors.js';
import { type ArchiveCategory } from '../../../application/use-cases/ArchiveCategory.js';
import { type UnarchiveCategory } from '../../../application/use-cases/UnarchiveCategory.js';
import { type ReorderCategories } from '../../../application/use-cases/ReorderCategories.js';
import { type ListCategories } from '../../../application/use-cases/ListCategories.js';
import {
  ChangeColorsBody,
  CreateBody,
  RenameBody,
  ReorderBody,
} from '../schemas/categorizationSchemas.js';

interface CategoryControllerDeps {
  readonly list: ListCategories;
  readonly create: CreateCategory;
  readonly rename: RenameCategory;
  readonly changeColors: ChangeCategoryColors;
  readonly archive: ArchiveCategory;
  readonly unarchive: UnarchiveCategory;
  readonly reorder: ReorderCategories;
}

interface CategoryView {
  readonly id: string;
  readonly name: string;
  readonly bgColor: string;
  readonly textColor: string;
  readonly isArchived: boolean;
  readonly displayOrder: number;
}

function serialize(c: CategoryView): CategoryView {
  return {
    id: c.id,
    name: c.name,
    bgColor: c.bgColor,
    textColor: c.textColor,
    isArchived: c.isArchived,
    displayOrder: c.displayOrder,
  };
}

function statusForCode(code: string): number {
  if (code.endsWith('_not_found')) return 404;
  if (code.startsWith('duplicate_')) return 409;
  return 400;
}

function errorBody(error: { code: string; message: string }) {
  return { error: { code: error.code, message: error.message } };
}

function readIdParam(req: Request): string | null {
  const raw = req.params.id;
  return typeof raw === 'string' ? raw : null;
}

export class CategoryController {
  constructor(private readonly deps: CategoryControllerDeps) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const includeArchived = req.query.includeArchived === 'true';
    const categories = await this.deps.list.execute({ includeArchived });
    res.json(categories.map(serialize));
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const parsed = CreateBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { code: 'invalid_request', issues: parsed.error.issues } });
      return;
    }
    const result = await this.deps.create.execute(parsed.data);
    if (!result.ok) {
      res.status(statusForCode(result.error.code)).json(errorBody(result.error));
      return;
    }
    res.status(201).json(serialize(result.value));
  };

  rename = async (req: Request, res: Response): Promise<void> => {
    const id = readIdParam(req);
    if (id === null) {
      res.status(400).json({ error: { code: 'invalid_id' } });
      return;
    }
    const parsed = RenameBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { code: 'invalid_request', issues: parsed.error.issues } });
      return;
    }
    const result = await this.deps.rename.execute({ id, newName: parsed.data.name });
    if (!result.ok) {
      res.status(statusForCode(result.error.code)).json(errorBody(result.error));
      return;
    }
    res.json(serialize(result.value));
  };

  changeColors = async (req: Request, res: Response): Promise<void> => {
    const id = readIdParam(req);
    if (id === null) {
      res.status(400).json({ error: { code: 'invalid_id' } });
      return;
    }
    const parsed = ChangeColorsBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { code: 'invalid_request', issues: parsed.error.issues } });
      return;
    }
    const result = await this.deps.changeColors.execute({ id, ...parsed.data });
    if (!result.ok) {
      res.status(statusForCode(result.error.code)).json(errorBody(result.error));
      return;
    }
    res.json(serialize(result.value));
  };

  archive = async (req: Request, res: Response): Promise<void> => {
    const id = readIdParam(req);
    if (id === null) {
      res.status(400).json({ error: { code: 'invalid_id' } });
      return;
    }
    const result = await this.deps.archive.execute({ id });
    if (!result.ok) {
      res.status(statusForCode(result.error.code)).json(errorBody(result.error));
      return;
    }
    res.json(serialize(result.value));
  };

  unarchive = async (req: Request, res: Response): Promise<void> => {
    const id = readIdParam(req);
    if (id === null) {
      res.status(400).json({ error: { code: 'invalid_id' } });
      return;
    }
    const result = await this.deps.unarchive.execute({ id });
    if (!result.ok) {
      res.status(statusForCode(result.error.code)).json(errorBody(result.error));
      return;
    }
    res.json(serialize(result.value));
  };

  reorder = async (req: Request, res: Response): Promise<void> => {
    const parsed = ReorderBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { code: 'invalid_request', issues: parsed.error.issues } });
      return;
    }
    const result = await this.deps.reorder.execute({ ids: parsed.data.ids });
    if (!result.ok) {
      res.status(statusForCode(result.error.code)).json(errorBody(result.error));
      return;
    }
    res.json(result.value.map(serialize));
  };
}
