import { type Request, type Response } from 'express';

import { serializeMonthlySummary } from '../../../application/dto/MonthlySummaryView.js';
import {
  serializeAvailableBudget,
  serializeNetOwed,
} from '../../../application/dto/NetOwedView.js';
import { serializeReceipt } from '../../../application/dto/ReceiptView.js';
import { type GetAvailableBudget } from '../../../application/use-cases/GetAvailableBudget.js';
import { type GetMonthlySummary } from '../../../application/use-cases/GetMonthlySummary.js';
import { type GetNetOwed } from '../../../application/use-cases/GetNetOwed.js';
import { type GetReceipt } from '../../../application/use-cases/GetReceipt.js';
import { type ExportAllData } from "../../../application/use-cases/ExportAllData.js";
import { renderExportAllDataCsv, renderReceiptCsv } from '../../../application/renderers/receiptCsv.js';
import { renderReceiptHtml } from '../../../application/renderers/receiptHtml.js';
import {
  AvailableBudgetQuery, ExportAllDataQuery,
  MonthlySummaryQuery,
  NetOwedQuery,
  ReceiptQuery,
} from '../schemas/reportingSchemas.js';

interface DomainErrorLike {
  readonly code: string;
  readonly message: string;
}

type Handler = (req: Request, res: Response) => Promise<void>;

export interface ReportingController {
  readonly getMonthlySummary: Handler;
  readonly getNetOwed: Handler;
  readonly getAvailableBudget: Handler;
  readonly getReceipt: Handler;
  readonly exportAllData: Handler;
}

export interface ReportingControllerDeps {
  readonly getMonthlySummary: GetMonthlySummary;
  readonly getNetOwed: GetNetOwed;
  readonly getAvailableBudget: GetAvailableBudget;
  readonly getReceipt: GetReceipt;
  readonly exportAllData: ExportAllData;
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

    getNetOwed: async (req, res) => {
      const query = NetOwedQuery.safeParse(req.query);
      if (!query.success) {
        res.status(400).json({ error: { code: 'invalid_request', issues: query.error.issues } });
        return;
      }
      const result = await deps.getNetOwed.execute({
        dateStart: new Date(query.data.dateStart),
        dateEnd: new Date(query.data.dateEnd),
      });
      if (!result.ok) {
        writeError(res, result.error);
        return;
      }
      res.json(serializeNetOwed(result.value));
    },

    getAvailableBudget: async (req, res) => {
      const query = AvailableBudgetQuery.safeParse(req.query);
      if (!query.success) {
        res.status(400).json({ error: { code: 'invalid_request', issues: query.error.issues } });
        return;
      }
      const result = await deps.getAvailableBudget.execute({ month: query.data.month });
      if (!result.ok) {
        writeError(res, result.error);
        return;
      }
      res.json(serializeAvailableBudget(result.value));
    },

    getReceipt: async (req, res) => {
      const query = ReceiptQuery.safeParse(req.query);
      if (!query.success) {
        res.status(400).json({ error: { code: 'invalid_request', issues: query.error.issues } });
        return;
      }
      const result = await deps.getReceipt.execute({
        dateStart: new Date(query.data.dateStart),
        dateEnd: new Date(query.data.dateEnd),
      });
      if (!result.ok) {
        writeError(res, result.error);
        return;
      }
      const receipt = result.value;
      switch (query.data.format) {
        case 'html':
          res.set('Content-Type', 'text/html; charset=utf-8');
          res.send(renderReceiptHtml(receipt, { simple: query.data.simple }));
          return;
        case 'csv': {
          const filename = `receipt-${ query.data.dateStart.slice(0, 10) }_${ query.data.dateEnd.slice(0, 10) }.csv`;
          res.set('Content-Type', 'text/csv; charset=utf-8');
          res.set('Content-Disposition', `attachment; filename="${ filename }"`);
          res.send(renderReceiptCsv(receipt));
          return;
        }
        case 'json':
        default:
          res.json(serializeReceipt(receipt));
          return;
      }
    },

    exportAllData: async (req, res) => {
      const query = ExportAllDataQuery.safeParse(req.query);

      if (!query.success) {
        res.status(400).json({ error: { code: 'invalid_request', issues: query.error.issues } });
        return;
      }

      const result = await deps.exportAllData.execute();

      if (!result.ok) {
        writeError(res, result.error);
        return;
      }

      const exportData = result.value;

      // 2. Generate a clean "All Data" filename using today's date
      const today = new Date().toISOString().slice(0, 10);
      const filename = `expense-export-all-${ today }.csv`;

      res.set('Content-Type', 'text/csv; charset=utf-8');
      res.set('Content-Disposition', `attachment; filename="${ filename }"`);
      res.send(renderExportAllDataCsv(exportData));
    }
  };
}

function statusForCode(code: string): number {
  if (code === 'invalid_month') return 400;
  if (code === 'invalid_date_range') return 400;
  if (code === 'mixed_currency_in_range') return 409;
  if (code === 'budget_currency_mismatch') return 409;
  if (code.endsWith('_not_found')) return 404;
  if (code.startsWith('invalid_')) return 400;
  return 400;
}

function writeError(res: Response, error: DomainErrorLike): void {
  res.status(statusForCode(error.code)).json({
    error: { code: error.code, message: error.message },
  });
}
