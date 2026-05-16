-- Milestone F — Expenses context. Adds the Expense table (FK'd to the three
-- reference tables) and drops the Milestone-C Ping placeholder.

-- DropTable
PRAGMA foreign_keys=OFF;
DROP TABLE "Ping";
PRAGMA foreign_keys=ON;

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "transactionDate" DATETIME NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "currency" TEXT NOT NULL,
    "rawInput" TEXT,
    "description" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "methodId" TEXT NOT NULL,
    "reimbursementStatusId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Expense_methodId_fkey" FOREIGN KEY ("methodId") REFERENCES "Method" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Expense_reimbursementStatusId_fkey" FOREIGN KEY ("reimbursementStatusId") REFERENCES "ReimbursementStatus" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Expense_transactionDate_idx" ON "Expense"("transactionDate");

-- CreateIndex
CREATE INDEX "Expense_categoryId_idx" ON "Expense"("categoryId");

-- CreateIndex
CREATE INDEX "Expense_methodId_idx" ON "Expense"("methodId");

-- CreateIndex
CREATE INDEX "Expense_reimbursementStatusId_idx" ON "Expense"("reimbursementStatusId");
