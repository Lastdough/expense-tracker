import { Router } from 'express';

import { type ImportController } from '../controllers/ImportController.js';

export function importRoutes(controller: ImportController): Router {
  const router = Router();
  router.post('/', controller.import);
  return router;
}
