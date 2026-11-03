import 'reflect-metadata';

import { DataSource } from 'typeorm';
import { ENTITIES } from './entities';
import { SnakeNamingStrategy } from './naming';
import { existsSync } from 'fs';
import * as path from 'path';

// The TypeORM CLI does not read env files: apps/api/.env when present, the real environment otherwise.
const envFile = path.resolve(__dirname, '../../.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);

/** Usado pelo CLI do TypeORM (migrations). */
export default new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
    entities: ENTITIES,
    migrations: [__dirname + '/migrations/*.js'],
    namingStrategy: new SnakeNamingStrategy()
});
