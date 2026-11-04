import 'reflect-metadata';

import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from '#/common/database/snake-naming.strategy.js';
import { loadConfig } from '#/config/env.js';
import { existsSync } from 'node:fs';
import path from 'node:path';

const ENV_FILES = ['../../.env', '../../../../.env'];
for (const file of ENV_FILES) {
    const envFile = path.resolve(import.meta.dirname, file);
    if (existsSync(envFile)) process.loadEnvFile(envFile);
}

const { ssl, ...database } = loadConfig().database;

/**
 * Data source used by the TypeORM CLI (`migration:generate`). The CLI does not read env
 * files, so `apps/api/.env` and the monorepo root `.env` are loaded here.
 */
export default new DataSource({
    type: 'postgres',
    ...database,
    ssl: ssl ? { rejectUnauthorized: false } : false,
    entities: [path.join(import.meta.dirname, '../modules/*/entities/*.entity.js')],
    migrations: [path.join(import.meta.dirname, 'migrations/*.js')],
    namingStrategy: new SnakeNamingStrategy()
});
