import { Router } from 'express';

import { type ExpenseController } from '../controllers/ExpenseController.js';

export function expenseRoutes(controller: ExpenseController): Router {
  const router = Router();
  router.get('/', controller.list);
  router.post('/', controller.record);
  router.get('/:id', controller.get);
  router.patch('/:id', controller.edit);
  router.delete('/:id', controller.delete);
  return router;
}
