import { type Request, type Response } from 'express';
import { type z } from 'zod';

import {
  serializeExpense,
  serializeExpenseList,
} from '../../../application/dto/ExpenseView.js';
import { type DeleteExpense } from '../../../application/use-cases/DeleteExpense.js';
import { type EditExpense } from '../../../application/use-cases/EditExpense.js';
import { type GetExpense } from '../../../application/use-cases/GetExpense.js';
import { type ListExpenses } from '../../../application/use-cases/ListExpenses.js';
import { type RecordExpense } from '../../../application/use-cases/RecordExpense.js';
import {
  EditExpenseBody,
  ListExpensesQuery,
  RecordExpenseBody,
} from '../schemas/expenseSchemas.js';

interface DomainErrorLike {
  readonly code: string;
  readonly message: string;
}

type Handler = (req: Request, res: Response) => Promise<void>;

export interface ExpenseController {
  readonly record: Handler;
  readonly list: Handler;
  readonly get: Handler;
  readonly edit: Handler;
  readonly delete: Handler;
}

export interface ExpenseControllerDeps {
  readonly record: RecordExpense;
  readonly list: ListExpenses;
  readonly get: GetExpense;
  readonly edit: EditExpense;
  readonly delete: DeleteExpense;
}

export function makeExpenseController(deps: ExpenseControllerDeps): ExpenseController {
  return {
    record: async (req, res) => {
      const body = parseBody(RecordExpenseBody, req, res);
      if (body === null) return;
      const result = await deps.record.execute({
        transactionDate: new Date(body.transactionDate),
        amountInput: body.amountInput,
        description: body.description,
        categoryId: body.categoryId,
        methodId: body.methodId,
        reimbursementStatusId: body.reimbursementStatusId,
      });
      if (!result.ok) {
        writeError(res, result.error);
        return;
      }
      res.status(201).json(serializeExpense(result.value));
    },

    list: async (req, res) => {
      const query = ListExpensesQuery.safeParse(req.query);
      if (!query.success) {
        res
          .status(400)
          .json({ error: { code: 'invalid_request', issues: query.error.issues } });
        return;
      }
      const result = await deps.list.execute({
        ...(query.data.dateStart ? { dateStart: new Date(query.data.dateStart) } : {}),
        ...(query.data.dateEnd ? { dateEnd: new Date(query.data.dateEnd) } : {}),
        ...(query.data.categoryId !== undefined ? { categoryId: query.data.categoryId } : {}),
        ...(query.data.methodId !== undefined ? { methodId: query.data.methodId } : {}),
        ...(query.data.reimbursementStatusId !== undefined
          ? { reimbursementStatusId: query.data.reimbursementStatusId }
          : {}),
        ...(query.data.descriptionQuery !== undefined
          ? { descriptionQuery: query.data.descriptionQuery }
          : {}),
        ...(query.data.limit !== undefined ? { limit: query.data.limit } : {}),
        ...(query.data.offset !== undefined ? { offset: query.data.offset } : {}),
      });
      if (!result.ok) {
        writeError(res, result.error);
        return;
      }
      res.json(serializeExpenseList(result.value));
    },

    get: async (req, res) => {
      const id = readIdParam(req, res);
      if (id === null) return;
      const result = await deps.get.execute({ id });
      if (!result.ok) {
        writeError(res, result.error);
        return;
      }
      res.json(serializeExpense(result.value));
    },

    edit: async (req, res) => {
      const id = readIdParam(req, res);
      if (id === null) return;
      const body = parseBody(EditExpenseBody, req, res);
      if (body === null) return;
      const result = await deps.edit.execute({
        id,
        ...(body.transactionDate ? { transactionDate: new Date(body.transactionDate) } : {}),
        ...(body.amountInput !== undefined ? { amountInput: body.amountInput } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.categoryId !== undefined ? { categoryId: body.categoryId } : {}),
        ...(body.methodId !== undefined ? { methodId: body.methodId } : {}),
        ...(body.reimbursementStatusId !== undefined
          ? { reimbursementStatusId: body.reimbursementStatusId }
          : {}),
      });
      if (!result.ok) {
        writeError(res, result.error);
        return;
      }
      res.json(serializeExpense(result.value));
    },

    delete: async (req, res) => {
      const id = readIdParam(req, res);
      if (id === null) return;
      const result = await deps.delete.execute({ id });
      if (!result.ok) {
        writeError(res, result.error);
        return;
      }
      res.status(204).end();
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
    res
      .status(400)
      .json({ error: { code: 'invalid_request', issues: parsed.error.issues } });
    return null;
  }
  return parsed.data;
}

function readIdParam(req: Request, res: Response): string | null {
  const raw = req.params.id;
  if (typeof raw !== 'string') {
    res.status(400).json({ error: { code: 'invalid_id' } });
    return null;
  }
  return raw;
}

function statusForCode(code: string): number {
  if (code === 'expense_not_found') return 404;
  if (code === 'reference_not_found') return 422;
  if (code === 'invalid_expense_id') return 400;
  if (code.endsWith('_not_found')) return 404;
  if (code.startsWith('invalid_')) return 400;
  return 400;
}

function writeError(res: Response, error: DomainErrorLike): void {
  const payload: { code: string; message: string; field?: string } = {
    code: error.code,
    message: error.message,
  };
  if ('field' in error && typeof (error as { field?: unknown }).field === 'string') {
    payload.field = (error as { field: string }).field;
  }
  res.status(statusForCode(error.code)).json({ error: payload });
}

