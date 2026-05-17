// Public re-exports of the expenses context's domain events. Other contexts
// react to these via the in-memory event bus; per the dependency rule they
// must subscribe through the application layer, not by reaching into domain/.

export {
  ExpenseRecorded,
  type ExpenseRecordedPayload,
} from '../../domain/events/ExpenseRecorded.js';
export {
  ExpenseEdited,
  type ExpenseEditedPayload,
  type ExpenseEditedChanges,
} from '../../domain/events/ExpenseEdited.js';
export {
  ExpenseDeleted,
  type ExpenseDeletedPayload,
} from '../../domain/events/ExpenseDeleted.js';
