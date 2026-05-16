-- Milestone F — Expenses context. Adds the Expense table (FK'd to the three
-- reference tables) and drops the Milestone-C Ping placeholder.

-- DropTable
DROP TABLE "Ping";

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "currency" TEXT NOT NULL,
    "rawInput" TEXT,
    "description" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "methodId" TEXT NOT NULL,
    "reimbursementStatusId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Expense_transactionDate_idx" ON "Expense"("transactionDate");

-- CreateIndex
CREATE INDEX "Expense_categoryId_idx" ON "Expense"("categoryId");

-- CreateIndex
CREATE INDEX "Expense_methodId_idx" ON "Expense"("methodId");

-- CreateIndex
CREATE INDEX "Expense_reimbursementStatusId_idx" ON "Expense"("reimbursementStatusId");

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_methodId_fkey" FOREIGN KEY ("methodId") REFERENCES "Method"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_reimbursementStatusId_fkey" FOREIGN KEY ("reimbursementStatusId") REFERENCES "ReimbursementStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
