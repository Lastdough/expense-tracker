-- Milestone H — Budgeting context. Singleton table holding the Phase-1
-- global monthly budget. `id` defaults to 'singleton' so the repository
-- upserts against a stable key. Phase 3's full budgeting context will
-- replace this table with a richer per-category Budget aggregate.

-- CreateTable
CREATE TABLE "MonthlyBudget" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "amountMinor" BIGINT NOT NULL,
    "currency" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
