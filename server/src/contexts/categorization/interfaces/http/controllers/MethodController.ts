import { type Request, type Response } from 'express';
import { type CreateMethod } from '../../../application/use-cases/CreateMethod.js';
import { type RenameMethod } from '../../../application/use-cases/RenameMethod.js';
import { type ChangeMethodColors } from '../../../application/use-cases/ChangeMethodColors.js';
import { type ArchiveMethod } from '../../../application/use-cases/ArchiveMethod.js';
import { type UnarchiveMethod } from '../../../application/use-cases/UnarchiveMethod.js';
import { type ReorderMethods } from '../../../application/use-cases/ReorderMethods.js';
import { type ListMethods } from '../../../application/use-cases/ListMethods.js';
import {
  ChangeColorsBody,
  CreateBody,
  RenameBody,
  ReorderBody,
} from '../schemas/categorizationSchemas.js';

interface MethodControllerDeps {
  readonly list: ListMethods;
  readonly create: CreateMethod;
  readonly rename: RenameMethod;
  readonly changeColors: ChangeMethodColors;
  readonly archive: ArchiveMethod;
  readonly unarchive: UnarchiveMethod;
  readonly reorder: ReorderMethods;
}

interface MethodView {
  readonly id: string;
  readonly name: string;
  readonly bgColor: string;
  readonly textColor: string;
  readonly isArchived: boolean;
  readonly displayOrder: number;
}

function serialize(m: MethodView): MethodView {
  return {
    id: m.id,
    name: m.name,
    bgColor: m.bgColor,
    textColor: m.textColor,
    isArchived: m.isArchived,
    displayOrder: m.displayOrder,
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

export class MethodController {
  constructor(private readonly deps: MethodControllerDeps) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const includeArchived = req.query.includeArchived === 'true';
    const methods = await this.deps.list.execute({ includeArchived });
    res.json(methods.map(serialize));
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
