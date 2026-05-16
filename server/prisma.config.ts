// Prisma 7 moved schema + datasource URL out of schema.prisma and into this
// config. We keep two parallel Prisma projects (one per provider) so each has
// its own migrations directory; DATABASE_PROVIDER routes between them.
//
// Loaded automatically by the Prisma CLI from the workspace root.

import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, env } from 'prisma/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const provider = process.env.DATABASE_PROVIDER ?? 'sqlite';
if (provider !== 'sqlite' && provider !== 'postgres') {
  throw new Error(
    `DATABASE_PROVIDER must be "sqlite" or "postgres"; got "${provider}". ` +
      `Set it in server/.env or pass it inline.`,
  );
}

const providerDir = path.join(__dirname, 'prisma', provider);

// noinspection JSUnusedGlobalSymbols -- consumed by the Prisma CLI, not by in-repo code
export default defineConfig({
  schema: path.join(providerDir, 'schema.prisma'),
  migrations: { path: path.join(providerDir, 'migrations') },
  datasource: { url: env('DATABASE_URL') },
});
