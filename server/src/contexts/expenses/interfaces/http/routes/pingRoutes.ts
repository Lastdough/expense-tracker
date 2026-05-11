import { Router } from 'express';
import { type PingController } from '../controllers/PingController.js';

export function pingRoutes(controller: PingController): Router {
  const router = Router();
  router.post('/ping', controller.record);
  router.get('/ping/latest', controller.latest);
  return router;
}
