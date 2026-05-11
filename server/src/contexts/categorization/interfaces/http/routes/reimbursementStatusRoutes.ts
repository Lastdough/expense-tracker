import { Router } from 'express';
import { type ReimbursementStatusController } from '../controllers/ReimbursementStatusController.js';

export function reimbursementStatusRoutes(controller: ReimbursementStatusController): Router {
  const router = Router();
  router.get('/', controller.list);
  router.post('/', controller.create);
  router.post('/reorder', controller.reorder);
  router.patch('/:id/name', controller.rename);
  router.patch('/:id/colors', controller.changeColors);
  router.post('/:id/archive', controller.archive);
  router.post('/:id/unarchive', controller.unarchive);
  return router;
}
