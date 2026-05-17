-- Milestone H — Budgeting context.

-- CreateTable
CREATE TABLE "MonthlyBudget" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "amountMinor" BIGINT NOT NULL,
    "currency" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyBudget_pkey" PRIMARY KEY ("id")
);
