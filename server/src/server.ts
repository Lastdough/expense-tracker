import express, { type NextFunction, type Request, type Response } from 'express';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig, type AppConfig } from './config/env.js';
import { buildContainer } from './container.js';
import { pingRoutes } from './contexts/expenses/interfaces/http/routes/pingRoutes.js';
import { referenceRoutes } from './contexts/categorization/interfaces/http/routes/referenceRoutes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const clientDir = path.resolve(repoRoot, 'client');
const clientDistDir = path.resolve(clientDir, 'dist');

function makeCorsMiddleware(corsOrigins: readonly string[]) {
  const allowAll = corsOrigins.includes('*');
  return function applyCors(req: Request, res: Response, next: NextFunction): void {
    const origin = req.headers.origin;
    if (allowAll) {
      res.setHeader('Access-Control-Allow-Origin', origin ?? '*');
    } else if (origin && corsOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  };
}

async function main(): Promise<void> {
  const config: AppConfig = loadConfig();
  const container = await buildContainer(config);

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, async () => {
      await container.shutdown();
      process.exit(0);
    });
  }

  const app = express();
  app.use(express.json());
  app.use(makeCorsMiddleware(config.corsOrigins));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/expenses', pingRoutes(container.pingController));
  app.use('/api/categories', referenceRoutes(container.categoryController));
  app.use('/api/methods', referenceRoutes(container.methodController));
  app.use('/api/reimbursement-statuses', referenceRoutes(container.reimbursementStatusController));

  if (!config.isProd) {
    const clientReady = existsSync(path.join(clientDir, 'index.html'));
    if (clientReady) {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        root: clientDir,
        server: { middlewareMode: true },
        appType: 'custom',
      });
      app.use(vite.middlewares);
      app.use(async (req, res, next) => {
        try {
          let html = await readFile(path.join(clientDir, 'index.html'), 'utf-8');
          html = await vite.transformIndexHtml(req.originalUrl, html);
          res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
        } catch (err) {
          vite.ssrFixStacktrace(err as Error);
          next(err);
        }
      });
      console.log('[server] Vite dev middleware active');
    } else {
      console.warn(
        '[server] client/index.html not found — frontend disabled. Server is API-only until the client is scaffolded.',
      );
    }
  } else if (config.serveFrontend) {
    if (!existsSync(clientDistDir)) {
      console.error(
        `[server] SERVE_FRONTEND=true but ${clientDistDir} does not exist. Build the client first.`,
      );
      process.exit(1);
    }
    app.use(express.static(clientDistDir));
    app.use((_req, res) => {
      res.sendFile(path.join(clientDistDir, 'index.html'));
    });
    console.log('[server] Serving client/dist as static frontend');
  }

  app.listen(config.port, () => {
    console.log(`[server] Listening on http://localhost:${config.port} (${config.nodeEnv})`);
  });
}

main().catch((err) => {
  console.error('[server] Fatal error during startup:', err);
  process.exit(1);
});
