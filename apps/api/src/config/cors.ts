const PRIVATE_HOST =
  /^https?:\/\/(localhost|127\.0\.0\.1|10(\.\d{1,3}){3}|192\.168(\.\d{1,3}){2}|172\.(1[6-9]|2\d|3[01])(\.\d{1,3}){2}|[a-z0-9-]+\.local)(:\d+)?$/i;

/**
 * Origens permitidas. As listadas em CORS_ORIGINS sempre valem. Fora de produção,
 * qualquer origem de rede local também vale (testar pelo celular via IP da rede).
 * Em produção só a lista explícita.
 */
export function isAllowedOrigin(origin: string | undefined, env: NodeJS.ProcessEnv = process.env): boolean {
  if (!origin) return true; // sem Origin: chamada servidor a servidor / mesma origem
  const listed = (env.CORS_ORIGINS ?? 'http://localhost:3000').split(',').map((s) => s.trim());
  if (listed.includes(origin)) return true;
  return env.NODE_ENV !== 'production' && PRIVATE_HOST.test(origin);
}

export const corsOrigin = (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) =>
  cb(null, isAllowedOrigin(origin));
