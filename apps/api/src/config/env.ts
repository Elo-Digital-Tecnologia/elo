import * as path from 'path';

export interface Env {
  DATABASE_URL: string;
  JWT_SECRET: string;
  SUPERADMIN_KEY: string;
  API_PORT: number;
  CORS_ORIGINS: string[];
  PUBLIC_BASE_URL: string;
  NODE_ENV: string;
  TABLE_SESSION_HOURS: number;
  /** Fuso dos relatórios (dia do restaurante). */
  REPORT_TZ: string;
  /** Pasta das imagens enviadas pelos restaurantes. */
  UPLOAD_DIR: string;
  /** Days a deleted restaurant's data is kept before it is erased for good. */
  RESTAURANT_PURGE_DAYS: number;
  /** Activity log entries older than this many days are erased on a schedule. */
  ACTIVITY_RETENTION_DAYS: number;
  /** How often, in hours, the activity log cleanup runs. */
  ACTIVITY_CLEANUP_HOURS: number;
  /** Web Push keys (`pnpm --filter @elo/api vapid:generate`). Without them, push stays off. */
  VAPID_PUBLIC_KEY: string | null;
  VAPID_PRIVATE_KEY: string | null;
  /** Contact sent to push services: mailto: or https: URL. Defaults to PUBLIC_BASE_URL. */
  VAPID_SUBJECT: string;
}

const required = ['DATABASE_URL', 'JWT_SECRET', 'SUPERADMIN_KEY'] as const;

/** Falha cedo se segredo faltar ou for fraco. Segredos só vêm de variáveis de ambiente. */
export function loadEnv(raw: Record<string, string | undefined> = process.env): Env {
  for (const key of required) {
    if (!raw[key]) throw new Error(`Missing env var ${key}`);
  }
  if (raw.JWT_SECRET!.length < 16) throw new Error('JWT_SECRET must be at least 16 chars');
  if (raw.SUPERADMIN_KEY!.length < 24) throw new Error('SUPERADMIN_KEY must be at least 24 chars');
  return {
    DATABASE_URL: raw.DATABASE_URL!,
    JWT_SECRET: raw.JWT_SECRET!,
    SUPERADMIN_KEY: raw.SUPERADMIN_KEY!,
    API_PORT: Number(raw.API_PORT ?? 3001),
    CORS_ORIGINS: (raw.CORS_ORIGINS ?? 'http://localhost:3000').split(',').map((s) => s.trim()),
    PUBLIC_BASE_URL: raw.PUBLIC_BASE_URL ?? 'http://localhost:3000',
    NODE_ENV: raw.NODE_ENV ?? 'development',
    TABLE_SESSION_HOURS: Number(raw.TABLE_SESSION_HOURS ?? 4),
    REPORT_TZ: raw.REPORT_TZ ?? 'America/Sao_Paulo',
    // Relative paths (like ./uploads in .env.example) resolve from where the API runs; files are served by absolute path.
    UPLOAD_DIR: path.resolve(process.cwd(), raw.UPLOAD_DIR || 'uploads'),
    RESTAURANT_PURGE_DAYS: positive(raw.RESTAURANT_PURGE_DAYS, 90, 'RESTAURANT_PURGE_DAYS'),
    ACTIVITY_RETENTION_DAYS: positive(raw.ACTIVITY_RETENTION_DAYS, 180, 'ACTIVITY_RETENTION_DAYS'),
    ACTIVITY_CLEANUP_HOURS: positive(raw.ACTIVITY_CLEANUP_HOURS, 24, 'ACTIVITY_CLEANUP_HOURS', 'hours'),
    VAPID_PUBLIC_KEY: raw.VAPID_PUBLIC_KEY || null,
    VAPID_PRIVATE_KEY: raw.VAPID_PRIVATE_KEY || null,
    VAPID_SUBJECT: raw.VAPID_SUBJECT || (raw.PUBLIC_BASE_URL ?? 'http://localhost:3000'),
  };
}

function positive(value: string | undefined, fallback: number, name: string, unit = 'days'): number {
  if (value === undefined || value === '') return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) throw new Error(`${name} must be a positive whole number of ${unit}`);
  return n;
}
