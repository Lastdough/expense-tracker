import { Router } from 'express';
import { type ReimbursementController } from '../controllers/makeReimbursementController.js';

export function reimbursementRoutes(controller: ReimbursementController): Router {
  const router = Router();
  // List comes before /:id so the routes don't ambiguously match.
  router.get('/', controller.list);
  router.get('/by-expense/:expenseId', controller.getByExpense);
  router.get('/:id', controller.get);
  router.post('/:id/mark-paid', controller.markPaid);
  router.post('/:id/mark-pending', controller.markPending);
  router.post('/:id/mark-early', controller.markEarly);
  router.post('/:id/mark-unpaid', controller.markUnpaid);
  router.post('/:id/mark-non-reimbursable', controller.markNonReimbursable);
  return router;
}
