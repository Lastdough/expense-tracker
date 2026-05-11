import { Router } from 'express';
import { type CategoryController } from '../controllers/CategoryController.js';

export function categoryRoutes(controller: CategoryController): Router {
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
