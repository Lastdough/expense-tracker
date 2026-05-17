-- Milestone G — Reimbursements context. Adds the Reimbursement table
-- (one row per Expense, unique on expenseId; cascade on Expense delete).

-- CreateTable
CREATE TABLE "Reimbursement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "expenseId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "paidAt" DATETIME,
    "receivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Reimbursement_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Reimbursement_expenseId_key" ON "Reimbursement"("expenseId");

-- CreateIndex
CREATE INDEX "Reimbursement_kind_idx" ON "Reimbursement"("kind");
