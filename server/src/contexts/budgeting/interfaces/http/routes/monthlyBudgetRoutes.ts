import { Router } from 'express';
import { type MonthlyBudgetController } from '../controllers/makeMonthlyBudgetController.js';

export function monthlyBudgetRoutes(controller: MonthlyBudgetController): Router {
  const router = Router();
  router.get('/', controller.get);
  router.put('/', controller.set);
  return router;
}
