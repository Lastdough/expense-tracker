import { type Request, type Response } from 'express';

import { type ImportExpenses } from '../../../application/use-cases/ImportExpenses.js';
import { ImportExpensesBody } from '../schemas/importSchemas.js';

interface DomainErrorLike {
  readonly code: string;
  readonly message: string;
}

type Handler = (req: Request, res: Response) => Promise<void>;

export interface ImportController {
  readonly import: Handler;
}

export interface ImportControllerDeps {
  readonly importExpenses: ImportExpenses;
}

export function makeImportController(deps: ImportControllerDeps): ImportController {
  return {
    import: async (req, res) => {
      const parsed = ImportExpensesBody.safeParse(req.body);
      if (!parsed.success) {
        res
          .status(400)
          .json({ error: { code: 'invalid_request', issues: parsed.error.issues } });
        return;
      }
      const result = await deps.importExpenses.execute({
        csvText: parsed.data.csvText,
        defaultYear: parsed.data.defaultYear,
        dryRun: parsed.data.dryRun,
      });
      if (!result.ok) {
        writeError(res, result.error);
        return;
      }
      // 200 on dry-run and on partial-validation results too — the body's
      // `committed` field carries the persistence outcome. Reserving 4xx for
      // structural problems (malformed CSV, missing column) avoids ambiguity.
      res.status(200).json(result.value);
    },
  };
}

function statusForCode(code: string): number {
  if (code === 'malformed_csv') return 400;
  if (code === 'missing_sheets_column') return 422;
  return 400;
}

function writeError(res: Response, error: DomainErrorLike): void {
  const payload: { code: string; message: string; columnName?: string } = {
    code: error.code,
    message: error.message,
  };
  if ('columnName' in error && typeof (error as { columnName?: unknown }).columnName === 'string') {
    payload.columnName = (error as { columnName: string }).columnName;
  }
  res.status(statusForCode(error.code)).json({ error: payload });
}
