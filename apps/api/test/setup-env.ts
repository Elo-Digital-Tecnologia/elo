import * as fs from 'fs';
import * as path from 'path';
import { parseEnv } from 'util';

/**
 * Points the e2e suites at their own database. Tests create restaurants and accounts
 * that must never land in the development database, so without `DATABASE_URL_TEST`
 * the e2e suites are skipped, and a test URL equal to `DATABASE_URL` is refused.
 */
const root = path.resolve(__dirname, '../../../.env');
// Jest gives each suite its own copy of process.env, so the file is parsed into it here.
const file = fs.existsSync(root) ? parseEnv(fs.readFileSync(root, 'utf8')) : {};
for (const [key, value] of Object.entries(file)) process.env[key] ??= value;

const dev = process.env.DATABASE_URL;
const test = process.env.DATABASE_URL_TEST;
if (test && test === dev) throw new Error('DATABASE_URL_TEST must point to a different database than DATABASE_URL');
if (test) process.env.DATABASE_URL = test;
else delete process.env.DATABASE_URL;
