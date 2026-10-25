import { registerAs } from '@nestjs/config';
import { ThrottlerOptions } from '@nestjs/throttler';

export const ThrottlerConfig = registerAs('throttler', (): ThrottlerOptions => ({
  throttlers: [
    {
      ttl: parseInt(process.env.THROTTLE_TTL || '60000', 10),
      limit: parseInt(process.env.THROTTLE_LIMIT || '100', 10)
    }
  ],
  storage: 'redis'
}));