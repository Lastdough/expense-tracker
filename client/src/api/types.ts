// Reference data — Categorization context.

export interface CategoryView {
  readonly id: string;
  readonly name: string;
  readonly bgColor: string;
  readonly textColor: string;
  readonly isArchived: boolean;
  readonly displayOrder: number;
}

export interface MethodView {
  readonly id: string;
  readonly name: string;
  readonly bgColor: string;
  readonly textColor: string;
  readonly isArchived: boolean;
  readonly displayOrder: number;
}

export interface ReimbursementStatusView {
  readonly id: string;
  readonly name: string;
  readonly bgColor: string;
  readonly textColor: string;
  readonly isArchived: boolean;
  readonly displayOrder: number;
}

export type ReferenceView = CategoryView | MethodView | ReimbursementStatusView;

export interface CreateInput {
  readonly name: string;
  readonly bgColor: string;
  readonly textColor: string;
}

export interface RenameInput {
  readonly name: string;
}

export interface ChangeColorsInput {
  readonly bgColor: string;
  readonly textColor: string;
}

export interface ReorderInput {
  readonly ids: ReadonlyArray<string>;
}

// Expenses context.

export interface ExpenseView {
  readonly id: string;
  readonly transactionDate: string;
  readonly amountMinor: string;
  readonly amountFormatted: string;
  readonly currency: string;
  readonly rawInput: string | null;
  readonly description: string;
  readonly categoryId: string;
  readonly methodId: string;
  readonly reimbursementStatusId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ExpenseListView {
  readonly items: readonly ExpenseView[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
}

export interface RecordExpenseInput {
  readonly transactionDate: string;
  readonly amountInput: string;
  readonly description: string;
  readonly categoryId: string;
  readonly methodId: string;
  readonly reimbursementStatusId: string;
}

export interface EditExpenseInput {
  readonly transactionDate?: string;
  readonly amountInput?: string;
  readonly description?: string;
  readonly categoryId?: string;
  readonly methodId?: string;
  readonly reimbursementStatusId?: string;
}

export interface ListExpensesQuery {
  readonly dateStart?: string;
  readonly dateEnd?: string;
  readonly categoryId?: string;
  readonly methodId?: string;
  readonly reimbursementStatusId?: string;
  readonly descriptionQuery?: string;
  readonly limit?: number;
  readonly offset?: number;
}

// Reimbursements context.

export type ReimbursementKind =
  | 'NonReimbursable'
  | 'UnpaidReimbursable'
  | 'PaidReimbursable'
  | 'EarlyReimbursement'
  | 'PendingReimbursement';

export interface ReimbursementView {
  readonly id: string;
  readonly expenseId: string;
  readonly kind: ReimbursementKind;
  readonly paidAt: string | null;
  readonly receivedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ReimbursementListView {
  readonly items: readonly ReimbursementView[];
}

// Reporting context.

export interface MoneyView {
  readonly amountMinor: string;
  readonly amountMajor: string;
}

export interface MonthlySummaryView {
  readonly month: string;
  readonly start: string;
  readonly end: string;
  readonly currency: string | null;
  readonly total: MoneyView | null;
  readonly expenseCount: number;
  readonly byCategory: readonly {
    readonly categoryId: string;
    readonly categoryName: string;
    readonly bgColor: string;
    readonly textColor: string;
    readonly amountMinor: string;
    readonly amountMajor: string;
    readonly count: number;
  }[];
  readonly byMethod: readonly {
    readonly methodId: string;
    readonly methodName: string;
    readonly bgColor: string;
    readonly textColor: string;
    readonly amountMinor: string;
    readonly amountMajor: string;
    readonly count: number;
  }[];
}

export interface NetOwedView {
  readonly dateStart: string;
  readonly dateEnd: string;
  readonly currency: string | null;
  readonly sumUnpaid: MoneyView | null;
  readonly sumEarly: MoneyView | null;
  readonly netOwed: MoneyView | null;
}

export interface AvailableBudgetView {
  readonly month: string;
  readonly currency: string | null;
  readonly monthlyBudget: MoneyView | null;
  readonly netOwed: MoneyView | null;
  readonly availableBudget: MoneyView | null;
}

export interface ReceiptView {
  readonly dateStart: string;
  readonly dateEnd: string;
  readonly currency: string | null;
  readonly lines: readonly {
    readonly description: string;
    readonly unpaidTotal: MoneyView;
    readonly earlyTotal: MoneyView;
    readonly total: MoneyView;
    readonly unpaidCount: number;
    readonly earlyCount: number;
  }[];
  readonly grandTotal: MoneyView | null;
}

// Budgeting context.

export interface MonthlyBudgetView {
  readonly amountMinor: string;
  readonly amountMajor: string;
  readonly currency: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface SetMonthlyBudgetInput {
  readonly amountMajor: string;
  readonly currency: string;
}
