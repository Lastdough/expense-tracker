import { randomUUID } from 'node:crypto';

import Papa from 'papaparse';

import { type EventBus } from '../../../../shared-kernel/domain-events/EventBus.js';
import { type Currency } from '../../../../shared-kernel/money/Currency.js';
import { err, ok, type Result } from '../../../../shared-kernel/result/Result.js';
import {
  type CategoryLookup,
  type ReferenceOption,
} from '../../../categorization/application/services/CategoryLookup.js';
import { type MethodLookup } from '../../../categorization/application/services/MethodLookup.js';
import { type ReimbursementStatusLookup } from '../../../categorization/application/services/ReimbursementStatusLookup.js';
import { Expense } from '../../domain/entities/Expense.js';
import {
  MalformedCsvError,
  MissingSheetsColumnError,
} from '../../domain/errors/SheetsImportErrors.js';
import { ExpenseRecorded } from '../../domain/events/ExpenseRecorded.js';
import { type IExpenseRepository } from '../../domain/repositories/IExpenseRepository.js';
import { evaluateFormula } from '../../domain/services/FormulaEvaluator.js';
import { CategoryRef } from '../../domain/value-objects/CategoryRef.js';
import { ExpenseId } from '../../domain/value-objects/ExpenseId.js';
import { MethodRef } from '../../domain/value-objects/MethodRef.js';
import { ReimbursementStatusRef } from '../../domain/value-objects/ReimbursementStatusRef.js';
import { findClosestName } from '../services/findClosestName.js';
import {
  normalizeHeader,
  parseSheetsRow,
  REQUIRED_COLUMNS,
} from '../services/SheetsRowParser.js';

const DEFAULT_CURRENCY: Currency = 'IDR';

export interface ImportExpensesInput {
  readonly csvText: string;
  readonly defaultYear: number;
  /** When true, validate every row but do not persist and do not publish events. */
  readonly dryRun: boolean;
}

export type RowReportStatus = 'ok' | 'error';

export interface RowReportError {
  readonly code: string;
  readonly field: string | null;
  readonly message: string;
  /** Closest existing reference-data name when the failure is a reference miss. */
  readonly suggestion: string | null;
}

export interface RowReport {
  /** 1-indexed row number, counting the header as 0. Matches what a user sees in Sheets. */
  readonly rowNumber: number;
  readonly status: RowReportStatus;
  /** Echo of the original cells for the client to display the offending row. */
  readonly raw: Readonly<Record<string, string>>;
  readonly error: RowReportError | null;
  /** Set when `status === 'ok'` AND `dryRun === false`. */
  readonly expenseId: string | null;
}

export interface ImportReport {
  readonly dryRun: boolean;
  readonly totalRows: number;
  readonly validRows: number;
  readonly invalidRows: number;
  readonly committed: boolean;
  readonly rows: readonly RowReport[];
}

export type ImportExpensesError = MalformedCsvError | MissingSheetsColumnError;

export class ImportExpenses {
  constructor(
    private readonly expenses: IExpenseRepository,
    private readonly categoryLookup: CategoryLookup,
    private readonly methodLookup: MethodLookup,
    private readonly statusLookup: ReimbursementStatusLookup,
    private readonly eventBus: EventBus,
    private readonly clock: () => Date = () => new Date(),
    private readonly newId: () => string = randomUUID,
  ) {}

  async execute(
    input: ImportExpensesInput,
  ): Promise<Result<ImportReport, ImportExpensesError>> {
    const parsed = Papa.parse<Record<string, string>>(input.csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: normalizeHeader,
    });
    if (parsed.errors.length > 0) {
      const first = parsed.errors[0];
      return err(
        new MalformedCsvError(
          `CSV parse error at row ${(first?.row ?? 0) + 1}: ${first?.message ?? 'unknown error'}`,
        ),
      );
    }

    const headerFields = (parsed.meta.fields ?? []).map((h) => normalizeHeader(h));
    for (const required of REQUIRED_COLUMNS) {
      if (!headerFields.includes(required)) {
        return err(new MissingSheetsColumnError(required));
      }
    }

    // Snapshot active reference data once per import. Names match
    // case-insensitively via the Lookup's `findIdByName`; fuzzy match against
    // these snapshots provides the "did you mean?" suggestion when a row fails.
    const [categoryOptions, methodOptions, statusOptions] = await Promise.all([
      this.categoryLookup.listActiveOptions(),
      this.methodLookup.listActiveOptions(),
      this.statusLookup.listActiveOptions(),
    ]);

    const reports: RowReport[] = [];
    const stagedExpenses: Expense[] = [];
    const stagedEvents: ExpenseRecorded[] = [];
    const now = this.clock();

    for (let index = 0; index < parsed.data.length; index++) {
      const cells = parsed.data[index] ?? {};
      const rowNumber = index + 2; // +1 for 1-indexing, +1 for the header row.

      const parsedRow = parseSheetsRow({ cells, defaultYear: input.defaultYear });
      if (!parsedRow.ok) {
        reports.push({
          rowNumber,
          status: 'error',
          raw: cells,
          error: {
            code: parsedRow.error.code,
            field: parsedRow.error.field,
            message: parsedRow.error.message,
            suggestion: null,
          },
          expenseId: null,
        });
        continue;
      }

      const refResult = await resolveReferences(parsedRow.value, {
        categoryLookup: this.categoryLookup,
        methodLookup: this.methodLookup,
        statusLookup: this.statusLookup,
        categoryOptions,
        methodOptions,
        statusOptions,
      });
      if (!refResult.ok) {
        reports.push({
          rowNumber,
          status: 'error',
          raw: cells,
          error: refResult.error,
          expenseId: null,
        });
        continue;
      }

      const formula = evaluateFormula(parsedRow.value.amountInput, DEFAULT_CURRENCY);
      if (!formula.ok) {
        reports.push({
          rowNumber,
          status: 'error',
          raw: cells,
          error: {
            code: 'invalid_expense_amount',
            field: 'out (rp.)',
            message: `Invalid amount: ${formula.error.message} (${formula.error.code})`,
            suggestion: null,
          },
          expenseId: null,
        });
        continue;
      }
      if (!formula.value.isPositive()) {
        reports.push({
          rowNumber,
          status: 'error',
          raw: cells,
          error: {
            code: 'invalid_expense_amount',
            field: 'out (rp.)',
            message: 'Expense amount must be positive.',
            suggestion: null,
          },
          expenseId: null,
        });
        continue;
      }

      const id = ExpenseId.create(this.newId());
      const expense = Expense.create({
        id,
        transactionDate: parsedRow.value.transactionDate,
        amount: formula.value,
        rawInput: null,
        description: parsedRow.value.description,
        categoryId: CategoryRef.create(refResult.value.categoryId),
        methodId: MethodRef.create(refResult.value.methodId),
        reimbursementStatusId: ReimbursementStatusRef.create(
          refResult.value.reimbursementStatusId,
        ),
        now,
      });

      stagedExpenses.push(expense);
      stagedEvents.push(
        new ExpenseRecorded(
          {
            expenseId: expense.id,
            transactionDate: expense.transactionDate.toISOString(),
            amountMinor: expense.amount.amount.toString(),
            currency: expense.amount.currency,
            description: expense.description,
            categoryId: expense.categoryId,
            methodId: expense.methodId,
            reimbursementStatusId: expense.reimbursementStatusId,
          },
          now,
        ),
      );

      reports.push({
        rowNumber,
        status: 'ok',
        raw: cells,
        error: null,
        expenseId: id,
      });
    }

    const validRows = reports.filter((r) => r.status === 'ok').length;
    const invalidRows = reports.length - validRows;
    const allValid = invalidRows === 0 && reports.length > 0;

    let committed = false;
    if (allValid && !input.dryRun) {
      // All-or-nothing: either every row persists in one transaction, or none.
      // The use case publishes ExpenseRecorded events AFTER the transaction
      // commits, matching the "publish after persistence succeeds" convention
      // from CLAUDE.md.
      await this.expenses.saveMany(stagedExpenses);
      for (const event of stagedEvents) this.eventBus.publish(event);
      committed = true;
    } else if (!input.dryRun) {
      // Clear expenseIds on the report so the client doesn't think they were
      // created — staged but never persisted.
      for (let i = 0; i < reports.length; i++) {
        const r = reports[i];
        if (r && r.status === 'ok') {
          reports[i] = { ...r, expenseId: null };
        }
      }
    }

    return ok({
      dryRun: input.dryRun,
      totalRows: reports.length,
      validRows,
      invalidRows,
      committed,
      rows: reports,
    });
  }
}

interface ResolveDeps {
  readonly categoryLookup: CategoryLookup;
  readonly methodLookup: MethodLookup;
  readonly statusLookup: ReimbursementStatusLookup;
  readonly categoryOptions: readonly ReferenceOption[];
  readonly methodOptions: readonly ReferenceOption[];
  readonly statusOptions: readonly ReferenceOption[];
}

interface ResolvedRefs {
  readonly categoryId: string;
  readonly methodId: string;
  readonly reimbursementStatusId: string;
}

async function resolveReferences(
  row: {
    readonly categoryName: string;
    readonly methodName: string;
    readonly reimbursementStatusName: string;
  },
  deps: ResolveDeps,
): Promise<Result<ResolvedRefs, RowReportError>> {
  const categoryId = await deps.categoryLookup.findIdByName(row.categoryName);
  if (categoryId === null) {
    return err(referenceError('category', row.categoryName, deps.categoryOptions));
  }
  const methodId = await deps.methodLookup.findIdByName(row.methodName);
  if (methodId === null) {
    return err(referenceError('method', row.methodName, deps.methodOptions));
  }
  const reimbursementStatusId = await deps.statusLookup.findIdByName(
    row.reimbursementStatusName,
  );
  if (reimbursementStatusId === null) {
    return err(
      referenceError('reimbursement', row.reimbursementStatusName, deps.statusOptions),
    );
  }
  return ok({ categoryId, methodId, reimbursementStatusId });
}

function referenceError(
  field: 'category' | 'method' | 'reimbursement',
  name: string,
  options: readonly ReferenceOption[],
): RowReportError {
  const candidates = options.map((o) => o.name);
  const suggestion = findClosestName(name, candidates);
  return {
    code: 'reference_not_found',
    field,
    message: suggestion
      ? `Unknown ${field} "${name}" — did you mean "${suggestion}"?`
      : `Unknown ${field} "${name}". No active match in the seeded ${field} list.`,
    suggestion,
  };
}
