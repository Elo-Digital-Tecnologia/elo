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
    UPLOAD_DIR: raw.UPLOAD_DIR ?? path.resolve(process.cwd(), 'uploads'),
  };
}
