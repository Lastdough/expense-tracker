import { type Request, type Response } from 'express';
import { type z } from 'zod';

import {
  serializeReimbursement,
  serializeReimbursementList,
} from '../../../application/dto/ReimbursementView.js';
import { type GetReimbursement } from '../../../application/use-cases/GetReimbursement.js';
import { type GetReimbursementByExpense } from '../../../application/use-cases/GetReimbursementByExpense.js';
import { type ListUnpaidReimbursables } from '../../../application/use-cases/ListUnpaidReimbursables.js';
import { type MarkAsEarly } from '../../../application/use-cases/MarkAsEarly.js';
import { type MarkAsNonReimbursable } from '../../../application/use-cases/MarkAsNonReimbursable.js';
import { type MarkAsPaid } from '../../../application/use-cases/MarkAsPaid.js';
import { type MarkAsPending } from '../../../application/use-cases/MarkAsPending.js';
import { type MarkAsUnpaid } from '../../../application/use-cases/MarkAsUnpaid.js';
import {
  ListUnpaidQuery,
  MarkAsEarlyBody,
  MarkAsPaidBody,
} from '../schemas/reimbursementSchemas.js';

interface DomainErrorLike {
  readonly code: string;
  readonly message: string;
}

type Handler = (req: Request, res: Response) => Promise<void>;

export interface ReimbursementController {
  readonly get: Handler;
  readonly getByExpense: Handler;
  readonly list: Handler;
  readonly markPaid: Handler;
  readonly markPending: Handler;
  readonly markEarly: Handler;
  readonly markUnpaid: Handler;
  readonly markNonReimbursable: Handler;
}

export interface ReimbursementControllerDeps {
  readonly get: GetReimbursement;
  readonly getByExpense: GetReimbursementByExpense;
  readonly listUnpaid: ListUnpaidReimbursables;
  readonly markPaid: MarkAsPaid;
  readonly markPending: MarkAsPending;
  readonly markEarly: MarkAsEarly;
  readonly markUnpaid: MarkAsUnpaid;
  readonly markNonReimbursable: MarkAsNonReimbursable;
}

export function makeReimbursementController(
  deps: ReimbursementControllerDeps,
): ReimbursementController {
  return {
    get: async (req, res) => {
      const id = readParam(req, res, 'id');
      if (id === null) return;
      const result = await deps.get.execute({ id });
      if (!result.ok) {
        writeError(res, result.error);
        return;
      }
      res.json(serializeReimbursement(result.value));
    },

    getByExpense: async (req, res) => {
      const expenseId = readParam(req, res, 'expenseId');
      if (expenseId === null) return;
      const result = await deps.getByExpense.execute({ expenseId });
      if (!result.ok) {
        writeError(res, result.error);
        return;
      }
      res.json(serializeReimbursement(result.value));
    },

    list: async (req, res) => {
      const query = ListUnpaidQuery.safeParse(req.query);
      if (!query.success) {
        res
          .status(400)
          .json({ error: { code: 'invalid_request', issues: query.error.issues } });
        return;
      }
      const result = await deps.listUnpaid.execute({
        dateStart: new Date(query.data.dateStart),
        dateEnd: new Date(query.data.dateEnd),
      });
      if (!result.ok) {
        writeError(res, result.error);
        return;
      }
      res.json(serializeReimbursementList(result.value.items));
    },

    markPaid: async (req, res) => {
      const id = readParam(req, res, 'id');
      if (id === null) return;
      const body = parseBody(MarkAsPaidBody, req, res);
      if (body === null) return;
      const result = await deps.markPaid.execute({ id, paidAt: new Date(body.paidAt) });
      if (!result.ok) {
        writeError(res, result.error);
        return;
      }
      res.json(serializeReimbursement(result.value));
    },

    markEarly: async (req, res) => {
      const id = readParam(req, res, 'id');
      if (id === null) return;
      const body = parseBody(MarkAsEarlyBody, req, res);
      if (body === null) return;
      const result = await deps.markEarly.execute({
        id,
        receivedAt: new Date(body.receivedAt),
      });
      if (!result.ok) {
        writeError(res, result.error);
        return;
      }
      res.json(serializeReimbursement(result.value));
    },

    markPending: async (req, res) => {
      const id = readParam(req, res, 'id');
      if (id === null) return;
      const result = await deps.markPending.execute({ id });
      if (!result.ok) {
        writeError(res, result.error);
        return;
      }
      res.json(serializeReimbursement(result.value));
    },

    markUnpaid: async (req, res) => {
      const id = readParam(req, res, 'id');
      if (id === null) return;
      const result = await deps.markUnpaid.execute({ id });
      if (!result.ok) {
        writeError(res, result.error);
        return;
      }
      res.json(serializeReimbursement(result.value));
    },

    markNonReimbursable: async (req, res) => {
      const id = readParam(req, res, 'id');
      if (id === null) return;
      const result = await deps.markNonReimbursable.execute({ id });
      if (!result.ok) {
        writeError(res, result.error);
        return;
      }
      res.json(serializeReimbursement(result.value));
    },
  };
}

function parseBody<S extends z.ZodTypeAny>(
  schema: S,
  req: Request,
  res: Response,
): z.infer<S> | null {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'invalid_request', issues: parsed.error.issues } });
    return null;
  }
  return parsed.data;
}

function readParam(req: Request, res: Response, name: string): string | null {
  const raw = req.params[name];
  if (typeof raw !== 'string') {
    res.status(400).json({ error: { code: 'invalid_request' } });
    return null;
  }
  return raw;
}

function statusForCode(code: string): number {
  if (code === 'illegal_transition') return 409;
  if (code === 'reimbursement_not_found') return 404;
  if (code === 'invalid_reimbursement_id') return 400;
  if (code === 'invalid_expense_ref') return 400;
  if (code === 'invalid_reimbursement_date') return 400;
  if (code === 'invalid_date_range') return 400;
  if (code.endsWith('_not_found')) return 404;
  if (code.startsWith('invalid_')) return 400;
  return 400;
}

function writeError(res: Response, error: DomainErrorLike): void {
  const payload: { code: string; message: string; from?: string; to?: string } = {
    code: error.code,
    message: error.message,
  };
  // Surface IllegalTransitionError's from/to for clients that want to render
  // "you can't go from PaidReimbursable to UnpaidReimbursable" inline.
  if ('from' in error && typeof (error as { from?: unknown }).from === 'string') {
    payload.from = (error as { from: string }).from;
  }
  if ('to' in error && typeof (error as { to?: unknown }).to === 'string') {
    payload.to = (error as { to: string }).to;
  }
  res.status(statusForCode(error.code)).json({ error: payload });
}
