import { registerAs } from '@nestjs/config';

// JWT_SECRET and SESSION_SECRET must come from the environment. A hardcoded
// fallback here would ship a publicly known secret in source control, letting
// anyone forge valid tokens in any deployment that forgets to set the env var.
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const JwtConfig = registerAs('jwt', () => ({
  secret: requireEnv('JWT_SECRET'),
  expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  sessionSecret: requireEnv('SESSION_SECRET'),
  sessionMaxAge: parseInt(process.env.SESSION_MAX_AGE || '14400000', 10)
}));