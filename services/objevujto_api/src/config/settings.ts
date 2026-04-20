import path from 'node:path';

const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');

function env(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

function boolEnv(name: string, fallback = true): boolean {
  const value = process.env[name];
  if (value == null) return fallback;
  return !['0', 'false', 'False', 'off', 'no'].includes(value);
}

export interface Settings {
  host: string;
  port: number;
  basePath: string;
  dbPath: string;
  seedPath: string;
  authMode: 'stub' | 'forward_header';
  authDefaultRole: string;
  authBaseUrl: string;
  publicBaseUrl: string;
  adminBaseUrl: string;
  publicApiBaseUrl: string;
  allowSeedOnStartup: boolean;
  publicCorsOrigins: string[];
  adminBuildDir: string;
}

export function getSettings(): Settings {
  return {
    host: env('OBJEVUJTO_BACKEND_HOST', '127.0.0.1'),
    port: Number(env('OBJEVUJTO_BACKEND_PORT', '8788')),
    basePath: env('OBJEVUJTO_BASE_PATH', '/objevujto'),
    dbPath: env('OBJEVUJTO_BACKEND_DB', path.resolve(rootDir, 'runtime', 'objevujto.sqlite3')),
    seedPath: env('OBJEVUJTO_BACKEND_SEED', path.resolve(rootDir, '..', 'objevujto_backend', 'data', 'seed_content.json')),
    authMode: env('OBJEVUJTO_AUTH_MODE', 'stub') as 'stub' | 'forward_header',
    authDefaultRole: env('OBJEVUJTO_AUTH_DEFAULT_ROLE', 'author'),
    authBaseUrl: env('OBJEVUJTO_AUTH_BASE_URL', 'https://auth.notjackal.eu'),
    publicBaseUrl: env('OBJEVUJTO_PUBLIC_BASE_URL', 'https://jackal1337.github.io/objevujto'),
    adminBaseUrl: env('OBJEVUJTO_ADMIN_BASE_URL', 'https://notjackal.eu/objevujto/admin'),
    publicApiBaseUrl: env('OBJEVUJTO_PUBLIC_API_BASE_URL', 'https://notjackal.eu/objevujto/api/public'),
    allowSeedOnStartup: boolEnv('OBJEVUJTO_ALLOW_SEED_ON_STARTUP', true),
    publicCorsOrigins: env('OBJEVUJTO_PUBLIC_CORS_ORIGINS', 'https://jackal1337.github.io,https://notjackal.eu,http://127.0.0.1:5500,http://localhost:5500')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
    adminBuildDir: env('OBJEVUJTO_ADMIN_BUILD_DIR', path.resolve(rootDir, '..', 'objevujto_admin', 'dist')),
  };
}
