import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import pg from 'pg';

// Creates the e2e database named by DATABASE_URL_TEST (when missing) and applies the migrations to it.
const env = new URL('../../../.env', import.meta.url);
if (existsSync(env)) process.loadEnvFile(env);
const { DATABASE_URL: dev, DATABASE_URL_TEST: test } = process.env;
if (!test) throw new Error('Set DATABASE_URL_TEST in .env first');
if (test === dev) throw new Error('DATABASE_URL_TEST must differ from DATABASE_URL');

const name = decodeURIComponent(new URL(test).pathname.slice(1));
const admin = new pg.Client({ connectionString: dev ?? test.replace(/\/[^/?]+(\?|$)/, '/postgres$1') });
await admin.connect();
const { rowCount } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);
if (!rowCount) {
  await admin.query(`CREATE DATABASE "${name.replace(/"/g, '""')}"`);
  console.log(`Created database ${name}`);
}
await admin.end();

const typeorm = createRequire(import.meta.url).resolve('typeorm/cli.js');
const run = spawnSync(process.execPath, [typeorm, 'migration:run', '-d', 'dist/database/data-source.js'], {
  stdio: 'inherit',
  env: { ...process.env, DATABASE_URL: test },
});
process.exit(run.status ?? 1);
