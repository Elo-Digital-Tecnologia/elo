import fs from 'node:fs';
import path from 'node:path';
import { parseEnv } from 'node:util';

/**
 * Points the e2e suites at their own database. Tests create restaurants and accounts
 * that must never land in the development database, so without `PG_TEST_DBNAME` the
 * e2e suites are skipped, and a test database equal to `PG_DBNAME` is refused.
 */
const ENV_FILES = ['../.env', '../../../.env'];
for (const file of ENV_FILES) {
    const envFile = path.resolve(import.meta.dirname, file);
    const values = fs.existsSync(envFile)
        ? parseEnv(fs.readFileSync(envFile, 'utf8'))
        : {};
    for (const [key, value] of Object.entries(values)) process.env[key] ??= value;
}

const testDatabase = process.env['PG_TEST_DBNAME'];
if (testDatabase && testDatabase === process.env['PG_DBNAME'])
    throw new Error('PG_TEST_DBNAME must differ from PG_DBNAME');
if (testDatabase) process.env['PG_DBNAME'] = testDatabase;
else delete process.env['PG_DBNAME'];
