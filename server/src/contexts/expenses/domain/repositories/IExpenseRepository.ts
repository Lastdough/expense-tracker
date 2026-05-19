import { type Expense } from '../entities/Expense.js';
import { type CategoryRef } from '../value-objects/CategoryRef.js';
import { type ExpenseId } from '../value-objects/ExpenseId.js';
import { type MethodRef } from '../value-objects/MethodRef.js';
import { type ReimbursementStatusRef } from '../value-objects/ReimbursementStatusRef.js';

/** Half-open `[start, end)`. Either bound may be omitted. */
export interface DateRange {
  readonly start?: Date;
  readonly end?: Date;
}

export interface ExpenseSearchCriteria {
  readonly dateRange?: DateRange;
  readonly categoryId?: CategoryRef;
  readonly methodId?: MethodRef;
  readonly reimbursementStatusId?: ReimbursementStatusRef;
  /** Case-insensitive substring match against `description`. */
  readonly descriptionQuery?: string;
  /** 1..200 */
  readonly limit: number;
  /** >= 0 */
  readonly offset: number;
}

export interface ExpenseSearchResult {
  readonly items: readonly Expense[];
  /** Total matching rows, ignoring `limit` / `offset`. */
  readonly total: number;
}

/**
 * Repository interface for the Expense aggregate. Methods speak the domain's
 * language, not generic CRUD — see CLAUDE.md. `findUnpaidReimbursables`
 * arrives in Milestone G once the Reimbursement value object gives the phrase
 * a precise meaning; today the generic `search` covers the listing UI.
 */
export interface IExpenseRepository {
  save(expense: Expense): Promise<void>;
  /**
   * Atomic bulk-create used by Sheets import. All rows commit together or none
   * do — implementations MUST wrap the writes in a database transaction.
   * Does not upsert; callers must supply fresh IDs.
   */
  saveMany(expenses: readonly Expense[]): Promise<void>;
  delete(id: ExpenseId): Promise<void>;
  findById(id: ExpenseId): Promise<Expense | null>;
  /** Returns expenses with `transactionDate` in `[range.start, range.end)`. */
  findInDateRange(range: { start: Date; end: Date }): Promise<Expense[]>;
  search(criteria: ExpenseSearchCriteria): Promise<ExpenseSearchResult>;
}
