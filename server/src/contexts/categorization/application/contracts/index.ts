// Public re-exports of categorization types that cross context boundaries.
// Other contexts may depend on these via the application layer; per the
// dependency rule they must not reach into categorization/domain.

export {
  REIMBURSEMENT_STATUS_KINDS,
  isReimbursementStatusKind,
  type ReimbursementStatusKind,
} from '../../domain/value-objects/ReimbursementStatusKind.js';
