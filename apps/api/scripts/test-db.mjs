import pg from 'pg';
import { existsSync } from 'node:fs';

// Creates the e2e database (when missing). Its schema is synchronized when the suites boot the app.
for (const file of ['../.env', '../../../.env']) {
    const envFile = new URL(file, import.meta.url);
    if (existsSync(envFile)) process.loadEnvFile(envFile);
}
const { PG_HOST, PG_PORT, PG_USER, PG_PASS, PG_DBNAME, PG_TEST_DBNAME } = process.env;
if (!PG_TEST_DBNAME) throw new Error('Set PG_TEST_DBNAME in apps/api/.env first');
if (PG_TEST_DBNAME === PG_DBNAME)
    throw new Error('PG_TEST_DBNAME must differ from PG_DBNAME');

const admin = new pg.Client({
    host: PG_HOST,
    port: Number(PG_PORT),
    user: PG_USER,
    password: PG_PASS,
    database: PG_DBNAME
});
await admin.connect();
const { rowCount } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [
    PG_TEST_DBNAME
]);
if (!rowCount) {
    await admin.query(`CREATE DATABASE "${PG_TEST_DBNAME.replace(/"/g, '""')}"`);
    console.log(`Created database ${PG_TEST_DBNAME}`);
}
await admin.end();
