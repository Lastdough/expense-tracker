import { type Request, type Response } from 'express';
import { type z } from 'zod';

import { serializeMonthlyBudget } from '../../../application/dto/MonthlyBudgetView.js';
import { type GetMonthlyBudget } from '../../../application/use-cases/GetMonthlyBudget.js';
import { type SetMonthlyBudget } from '../../../application/use-cases/SetMonthlyBudget.js';
import { SetMonthlyBudgetBody } from '../schemas/monthlyBudgetSchemas.js';

interface DomainErrorLike {
  readonly code: string;
  readonly message: string;
}

type Handler = (req: Request, res: Response) => Promise<void>;

export interface MonthlyBudgetController {
  readonly get: Handler;
  readonly set: Handler;
}

export interface MonthlyBudgetControllerDeps {
  readonly get: GetMonthlyBudget;
  readonly set: SetMonthlyBudget;
}

export function makeMonthlyBudgetController(
  deps: MonthlyBudgetControllerDeps,
): MonthlyBudgetController {
  return {
    get: async (_req, res) => {
      const result = await deps.get.execute();
      if (!result.ok) {
        writeError(res, result.error);
        return;
      }
      const { budget } = result.value;
      res.json({ budget: budget ? serializeMonthlyBudget(budget) : null });
    },

    set: async (req, res) => {
      const body = parseBody(SetMonthlyBudgetBody, req, res);
      if (body === null) return;
      const result = await deps.set.execute({
        amountMajor: body.amountMajor,
        currency: body.currency,
      });
      if (!result.ok) {
        writeError(res, result.error);
        return;
      }
      res.json({ budget: serializeMonthlyBudget(result.value) });
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

function statusForCode(code: string): number {
  if (code === 'unsupported_currency') return 400;
  if (code === 'invalid_monthly_budget_amount') return 400;
  if (code.endsWith('_not_found')) return 404;
  if (code.startsWith('invalid_')) return 400;
  return 400;
}

function writeError(res: Response, error: DomainErrorLike): void {
  res.status(statusForCode(error.code)).json({
    error: { code: error.code, message: error.message },
  });
}
