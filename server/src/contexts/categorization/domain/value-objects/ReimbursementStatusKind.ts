// Stable discriminator carried by ReimbursementStatus rows. Set at seed/create
// time and never mutated thereafter — renaming a status (e.g. "Unpaid
// Reimbursable" → "Outstanding") must not change which state-machine kind
// the reimbursements context maps it to.

export const REIMBURSEMENT_STATUS_KINDS = [
  'NonReimbursable',
  'UnpaidReimbursable',
  'PaidReimbursable',
  'EarlyReimbursement',
  'PendingReimbursement',
] as const;

export type ReimbursementStatusKind = (typeof REIMBURSEMENT_STATUS_KINDS)[number];

export function isReimbursementStatusKind(value: unknown): value is ReimbursementStatusKind {
  return (
    typeof value === 'string' &&
    (REIMBURSEMENT_STATUS_KINDS as readonly string[]).includes(value)
  );
}
