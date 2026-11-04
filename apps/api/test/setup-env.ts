import pg from 'pg';
import { inject } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { parseEnv } from 'node:util';

/**
 * Reads the app's `.env` files for the rest of the config, then points the database at
 * the e2e container (`global-setup.ts`). Each worker has its own database, so files run
 * in parallel without touching each other's data, and nothing lands in the dev database.
 */
const ENV_FILES = ['../.env', '../../../.env'];
for (const file of ENV_FILES) {
    const envFile = path.resolve(import.meta.dirname, file);
    const values = fs.existsSync(envFile)
        ? parseEnv(fs.readFileSync(envFile, 'utf8'))
        : {};
    for (const [key, value] of Object.entries(values)) process.env[key] ??= value;
}

/** Lowest bcrypt cost: password hashing is not what these suites check. */
const TEST_PASSWORD_HASH_COST = '4';

const { host, port, user, password } = inject('postgres');
const database = `e2e_${process.env['VITEST_POOL_ID'] ?? '0'}`;

const admin = new pg.Client({ host, port, user, password, database: 'postgres' });
await admin.connect();
const { rowCount } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [
    database
]);
if (!rowCount) await admin.query(`CREATE DATABASE "${database}"`);
await admin.end();

Object.assign(process.env, {
    PG_HOST: host,
    PG_PORT: String(port),
    PG_USER: user,
    PG_PASS: password,
    PG_DBNAME: database,
    PG_SSL: 'false',
    APP_PASSWORD_HASH_COST: TEST_PASSWORD_HASH_COST
});
