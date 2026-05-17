import { type Request, type Response } from 'express';

import { serializeMonthlySummary } from '../../../application/dto/MonthlySummaryView.js';
import { type GetMonthlySummary } from '../../../application/use-cases/GetMonthlySummary.js';
import { MonthlySummaryQuery } from '../schemas/reportingSchemas.js';

interface DomainErrorLike {
  readonly code: string;
  readonly message: string;
}

type Handler = (req: Request, res: Response) => Promise<void>;

export interface ReportingController {
  readonly getMonthlySummary: Handler;
}

export interface ReportingControllerDeps {
  readonly getMonthlySummary: GetMonthlySummary;
}

export function makeReportingController(deps: ReportingControllerDeps): ReportingController {
  return {
    getMonthlySummary: async (req, res) => {
      const query = MonthlySummaryQuery.safeParse(req.query);
      if (!query.success) {
        res.status(400).json({ error: { code: 'invalid_request', issues: query.error.issues } });
        return;
      }
      const result = await deps.getMonthlySummary.execute({ month: query.data.month });
      if (!result.ok) {
        writeError(res, result.error);
        return;
      }
      res.json(serializeMonthlySummary(result.value));
    },
  };
}

function statusForCode(code: string): number {
  if (code === 'invalid_month') return 400;
  if (code === 'invalid_date_range') return 400;
  if (code === 'mixed_currency_in_range') return 409;
  if (code.endsWith('_not_found')) return 404;
  if (code.startsWith('invalid_')) return 400;
  return 400;
}

function writeError(res: Response, error: DomainErrorLike): void {
  res.status(statusForCode(error.code)).json({
    error: { code: error.code, message: error.message },
  });
}
