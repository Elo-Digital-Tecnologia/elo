import { registerAs } from '@nestjs/config';

export const AppConfig = registerAs('app', () => ({
  port: parseInt(process.env.PORT || '4000', 10),
  env: process.env.NODE_ENV || 'development',
  frontendUrls: (process.env.FRONTEND_URLS || 'http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003').split(','),
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
  superadminKey: process.env.SUPERADMIN_KEY || '',
  corsOrigins: (process.env.FRONTEND_URLS || 'http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003').split(',')
}));