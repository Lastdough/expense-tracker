import { Router } from 'express';
import { type ReportingController } from '../controllers/makeReportingController.js';

export function reportingRoutes(controller: ReportingController): Router {
  const router = Router();
  router.get('/monthly-summary', controller.getMonthlySummary);
  router.get('/net-owed', controller.getNetOwed);
  router.get('/available-budget', controller.getAvailableBudget);
  router.get('/receipt', controller.getReceipt);
  return router;
}
