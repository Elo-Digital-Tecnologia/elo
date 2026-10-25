import { registerAs } from '@nestjs/config';
import { DataSourceOptions } from 'typeorm';
import { entities } from '@elo-digital/database/entities';

export const DatabaseConfig = registerAs('database', (): DataSourceOptions => ({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'elo_digital',
  password: process.env.DB_PASSWORD || 'elo_digital',
  database: process.env.DB_NAME || 'elo_digital',
  entities,
  synchronize: process.env.NODE_ENV === 'development' && process.env.DB_SYNC === 'true',
  logging: process.env.NODE_ENV === 'development' && process.env.DB_LOG === 'true',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  migrationsTableName: 'migrations',
  migrations: ['dist/migrations/*.js'],
  extra: {
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
  }
}));