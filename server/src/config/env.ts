import 'dotenv/config';

export type NodeEnv = 'development' | 'production' | 'test';

export interface AppConfig {
  readonly port: number;
  readonly nodeEnv: NodeEnv;
  readonly isProd: boolean;
  readonly serveFrontend: boolean;
  readonly corsOrigins: readonly string[];
}

const NODE_ENVS: readonly NodeEnv[] = ['development', 'production', 'test'];

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

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const nodeEnv = parseNodeEnv(env.NODE_ENV ?? 'development');
  const isProd = nodeEnv === 'production';
  return {
    port: parsePort(env.PORT ?? '3000'),
    nodeEnv,
    isProd,
    serveFrontend: parseBool('SERVE_FRONTEND', env.SERVE_FRONTEND, false),
    corsOrigins: isProd ? parseOrigins(env.CORS_ORIGINS) : ['*'],
  };
}
