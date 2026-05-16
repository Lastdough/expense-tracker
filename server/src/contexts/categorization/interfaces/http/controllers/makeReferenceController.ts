import { type Request, type Response } from 'express';
import { type z } from 'zod';
import { type Result } from '../../../../../shared-kernel/result/Result.js';
import {
  ChangeColorsBody,
  CreateBody,
  RenameBody,
  ReorderBody,
} from '../schemas/categorizationSchemas.js';

export interface ReferenceView {
  readonly id: string;
  readonly name: string;
  readonly bgColor: string;
  readonly textColor: string;
  readonly isArchived: boolean;
  readonly displayOrder: number;
}

interface DomainErrorLike {
  readonly code: string;
  readonly message: string;
}

interface ListUseCase<T> {
  execute(input: { readonly includeArchived: boolean }): Promise<readonly T[]>;
}
interface CreateUseCase<T> {
  execute(input: {
    readonly name: string;
    readonly bgColor: string;
    readonly textColor: string;
  }): Promise<Result<T, DomainErrorLike>>;
}
interface RenameUseCase<T> {
  execute(input: {
    readonly id: string;
    readonly newName: string;
  }): Promise<Result<T, DomainErrorLike>>;
}
interface ChangeColorsUseCase<T> {
  execute(input: {
    readonly id: string;
    readonly bgColor: string;
    readonly textColor: string;
  }): Promise<Result<T, DomainErrorLike>>;
}
interface IdOnlyUseCase<T> {
  execute(input: { readonly id: string }): Promise<Result<T, DomainErrorLike>>;
}
interface ReorderUseCase<T> {
  execute(input: {
    readonly ids: readonly string[];
  }): Promise<Result<readonly T[], DomainErrorLike>>;
}

export interface ReferenceControllerDeps<T extends ReferenceView> {
  readonly list: ListUseCase<T>;
  readonly create: CreateUseCase<T>;
  readonly rename: RenameUseCase<T>;
  readonly changeColors: ChangeColorsUseCase<T>;
  readonly archive: IdOnlyUseCase<T>;
  readonly unarchive: IdOnlyUseCase<T>;
  readonly reorder: ReorderUseCase<T>;
}

type Handler = (req: Request, res: Response) => Promise<void>;

export interface ReferenceController {
  readonly list: Handler;
  readonly create: Handler;
  readonly rename: Handler;
  readonly changeColors: Handler;
  readonly archive: Handler;
  readonly unarchive: Handler;
  readonly reorder: Handler;
}

function serialize(v: ReferenceView): ReferenceView {
  return {
    id: v.id,
    name: v.name,
    bgColor: v.bgColor,
    textColor: v.textColor,
    isArchived: v.isArchived,
    displayOrder: v.displayOrder,
  };
}

function statusForCode(code: string): number {
  if (code.endsWith('_not_found')) return 404;
  if (code.startsWith('duplicate_')) return 409;
  return 400;
}

function writeError(res: Response, error: DomainErrorLike): void {
  res
    .status(statusForCode(error.code))
    .json({ error: { code: error.code, message: error.message } });
}

function readIdParam(req: Request, res: Response): string | null {
  const raw = req.params.id;
  if (typeof raw !== 'string') {
    res.status(400).json({ error: { code: 'invalid_id' } });
    return null;
  }
  return raw;
}

function parseBody<S extends z.ZodTypeAny>(
  schema: S,
  req: Request,
  res: Response,
): z.infer<S> | null {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: { code: 'invalid_request', issues: parsed.error.issues } });
    return null;
  }
  return parsed.data;
}

function respondOne<T extends ReferenceView>(
  result: Result<T, DomainErrorLike>,
  res: Response,
  successStatus = 200,
): void {
  if (!result.ok) {
    writeError(res, result.error);
    return;
  }
  res.status(successStatus).json(serialize(result.value));
}

function respondMany<T extends ReferenceView>(
  result: Result<readonly T[], DomainErrorLike>,
  res: Response,
): void {
  if (!result.ok) {
    writeError(res, result.error);
    return;
  }
  res.json(result.value.map(serialize));
}

export function makeReferenceController<T extends ReferenceView>(
  deps: ReferenceControllerDeps<T>,
): ReferenceController {
  return {
    list: async (req, res) => {
      const items = await deps.list.execute({
        includeArchived: req.query.includeArchived === 'true',
      });
      res.json(items.map(serialize));
    },

    create: async (req, res) => {
      const body = parseBody(CreateBody, req, res);
      if (body === null) return;
      respondOne(await deps.create.execute(body), res, 201);
    },

    rename: async (req, res) => {
      const id = readIdParam(req, res);
      if (id === null) return;
      const body = parseBody(RenameBody, req, res);
      if (body === null) return;
      respondOne(await deps.rename.execute({ id, newName: body.name }), res);
    },

    changeColors: async (req, res) => {
      const id = readIdParam(req, res);
      if (id === null) return;
      const body = parseBody(ChangeColorsBody, req, res);
      if (body === null) return;
      respondOne(await deps.changeColors.execute({ id, ...body }), res);
    },

    archive: async (req, res) => {
      const id = readIdParam(req, res);
      if (id === null) return;
      respondOne(await deps.archive.execute({ id }), res);
    },

    unarchive: async (req, res) => {
      const id = readIdParam(req, res);
      if (id === null) return;
      respondOne(await deps.unarchive.execute({ id }), res);
    },

    reorder: async (req, res) => {
      const body = parseBody(ReorderBody, req, res);
      if (body === null) return;
      respondMany(await deps.reorder.execute({ ids: body.ids }), res);
    },
  };
}
