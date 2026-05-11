import 'dotenv/config';

export type NodeEnv = 'development' | 'production' | 'test';
export type DatabaseProvider = 'sqlite' | 'postgres';

export interface AppConfig {
  readonly port: number;
  readonly nodeEnv: NodeEnv;
  readonly isProd: boolean;
  readonly serveFrontend: boolean;
  readonly corsOrigins: readonly string[];
  readonly databaseProvider: DatabaseProvider;
  readonly databaseUrl: string;
}

const NODE_ENVS: readonly NodeEnv[] = ['development', 'production', 'test'];
const DATABASE_PROVIDERS: readonly DatabaseProvider[] = ['sqlite', 'postgres'];

export class ConfigError extends Error {
  constructor(message: string) {
    super(`Invalid configuration: ${message}`);
    this.name = 'ConfigError';
  }
}

function parseNodeEnv(value: string): NodeEnv {
  if (!(NODE_ENVS as readonly string[]).includes(value)) {
    throw new ConfigError(`NODE_ENV must be one of ${NODE_ENVS.join('|')}; got "${value}"`);
  }
  return value as NodeEnv;
}

function parsePort(value: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 65535) {
    throw new ConfigError(`PORT must be an integer 1-65535; got "${value}"`);
  }
  return n;
}

function parseBool(name: string, value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  throw new ConfigError(`${name} must be true|false|1|0; got "${value}"`);
}

function parseOrigins(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseDatabaseProvider(value: string): DatabaseProvider {
  if (!(DATABASE_PROVIDERS as readonly string[]).includes(value)) {
    throw new ConfigError(
      `DATABASE_PROVIDER must be one of ${DATABASE_PROVIDERS.join('|')}; got "${value}"`,
    );
  }
  return value as DatabaseProvider;
}

function parseDatabaseUrl(value: string | undefined, provider: DatabaseProvider): string {
  if (!value || value.trim() === '') {
    throw new ConfigError(`DATABASE_URL is required (provider: ${provider})`);
  }
  return value;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const nodeEnv = parseNodeEnv(env.NODE_ENV ?? 'development');
  const isProd = nodeEnv === 'production';
  const databaseProvider = parseDatabaseProvider(env.DATABASE_PROVIDER ?? 'sqlite');
  return {
    port: parsePort(env.PORT ?? '3000'),
    nodeEnv,
    isProd,
    serveFrontend: parseBool('SERVE_FRONTEND', env.SERVE_FRONTEND, false),
    corsOrigins: isProd ? parseOrigins(env.CORS_ORIGINS) : ['*'],
    databaseProvider,
    databaseUrl: parseDatabaseUrl(env.DATABASE_URL, databaseProvider),
  };
}
