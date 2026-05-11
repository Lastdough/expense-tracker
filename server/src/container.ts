// Composition root.
//
// The ONE place in the codebase where concrete classes are instantiated and
// wired. Everything else takes its collaborators via constructor injection,
// keeping the rest of the code unaware of which database, ORM, or transport
// is in use.
//
// Per CLAUDE.md: PrismaClient construction lives here (the composition root),
// never inside contexts/*/domain or contexts/*/application.

import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '@prisma/client';

import { type AppConfig } from './config/env.js';
import { GetLatestPing } from './contexts/expenses/application/use-cases/GetLatestPing.js';
import { PingExpenses } from './contexts/expenses/application/use-cases/PingExpenses.js';
import { PrismaPingRepository } from './contexts/expenses/infrastructure/persistence/prisma/PrismaPingRepository.js';
import { PingController } from './contexts/expenses/interfaces/http/controllers/PingController.js';

export interface Container {
  readonly pingController: PingController;
  shutdown(): Promise<void>;
}

export async function buildContainer(config: AppConfig): Promise<Container> {
  const prisma = createPrismaClient(config);

  const pingRepository = new PrismaPingRepository(prisma);
  const pingExpenses = new PingExpenses(pingRepository);
  const getLatestPing = new GetLatestPing(pingRepository);
  const pingController = new PingController(pingExpenses, getLatestPing);

  return {
    pingController,
    async shutdown() {
      await prisma.$disconnect();
    },
  };
}

function createPrismaClient(config: AppConfig): PrismaClient {
  switch (config.databaseProvider) {
    case 'sqlite': {
      const adapter = new PrismaBetterSqlite3({ url: config.databaseUrl });
      return new PrismaClient({ adapter });
    }
    case 'postgres': {
      // Prisma 7 requires a driver adapter for direct DB connections — no more
      // `datasourceUrl`. Wiring @prisma/adapter-pg is deferred to the deploy
      // milestone; migrations against Postgres still work via `pnpm db:migrate`
      // because the CLI uses the schema engine, not the runtime client.
      throw new Error(
        'Postgres runtime is not wired yet. Install @prisma/adapter-pg + pg and ' +
          'add a PrismaPg adapter case here. Migration scripts already work — ' +
          'set DATABASE_PROVIDER=postgres and run `pnpm db:migrate`.',
      );
    }
  }
}
