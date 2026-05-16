-- Milestone G — Categorization. Adds a stable `kind` discriminator to
-- ReimbursementStatus so the reimbursements context can translate a
-- user-picked status into a ReimbursementState variant regardless of
-- later renames. New column defaults to 'NonReimbursable'; the five
-- seeded statuses are backfilled to their canonical kinds by
-- nameNormalized match.

-- AlterTable
ALTER TABLE "ReimbursementStatus" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'NonReimbursable';

-- Backfill known seed names.
UPDATE "ReimbursementStatus" SET "kind" = 'UnpaidReimbursable'   WHERE "nameNormalized" = 'unpaid reimbursable';
UPDATE "ReimbursementStatus" SET "kind" = 'PaidReimbursable'     WHERE "nameNormalized" = 'paid reimbursable';
UPDATE "ReimbursementStatus" SET "kind" = 'EarlyReimbursement'   WHERE "nameNormalized" = 'early reimbursement';
UPDATE "ReimbursementStatus" SET "kind" = 'PendingReimbursement' WHERE "nameNormalized" = 'pending reimbursement';
