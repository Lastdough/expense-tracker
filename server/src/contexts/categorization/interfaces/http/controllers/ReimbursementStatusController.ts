import { type Request, type Response } from 'express';
import { type CreateReimbursementStatus } from '../../../application/use-cases/CreateReimbursementStatus.js';
import { type RenameReimbursementStatus } from '../../../application/use-cases/RenameReimbursementStatus.js';
import { type ChangeReimbursementStatusColors } from '../../../application/use-cases/ChangeReimbursementStatusColors.js';
import { type ArchiveReimbursementStatus } from '../../../application/use-cases/ArchiveReimbursementStatus.js';
import { type UnarchiveReimbursementStatus } from '../../../application/use-cases/UnarchiveReimbursementStatus.js';
import { type ReorderReimbursementStatuses } from '../../../application/use-cases/ReorderReimbursementStatuses.js';
import { type ListReimbursementStatuses } from '../../../application/use-cases/ListReimbursementStatuses.js';
import {
  ChangeColorsBody,
  CreateBody,
  RenameBody,
  ReorderBody,
} from '../schemas/categorizationSchemas.js';

interface ReimbursementStatusControllerDeps {
  readonly list: ListReimbursementStatuses;
  readonly create: CreateReimbursementStatus;
  readonly rename: RenameReimbursementStatus;
  readonly changeColors: ChangeReimbursementStatusColors;
  readonly archive: ArchiveReimbursementStatus;
  readonly unarchive: UnarchiveReimbursementStatus;
  readonly reorder: ReorderReimbursementStatuses;
}

interface ReimbursementStatusView {
  readonly id: string;
  readonly name: string;
  readonly bgColor: string;
  readonly textColor: string;
  readonly isArchived: boolean;
  readonly displayOrder: number;
}

function serialize(s: ReimbursementStatusView): ReimbursementStatusView {
  return {
    id: s.id,
    name: s.name,
    bgColor: s.bgColor,
    textColor: s.textColor,
    isArchived: s.isArchived,
    displayOrder: s.displayOrder,
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

export class ReimbursementStatusController {
  constructor(private readonly deps: ReimbursementStatusControllerDeps) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const includeArchived = req.query.includeArchived === 'true';
    const statuses = await this.deps.list.execute({ includeArchived });
    res.json(statuses.map(serialize));
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
