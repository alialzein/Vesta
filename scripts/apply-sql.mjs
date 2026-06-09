/**
 * Apply a SQL file (or an inline --query) to the REMOTE Supabase Postgres using the
 * direct connection in .env.local (SUPABASE_DB_HOST/PORT/NAME/USER/PASSWORD).
 *
 * DDL (CREATE TABLE / FUNCTION / POLICY) can't go through the supabase-js REST API,
 * so this connects with node-postgres over SSL and runs the statements in ONE
 * transaction (all-or-nothing).
 *
 * Usage:
 *   node scripts/apply-sql.mjs supabase/migrations/<file>.sql
 *   node scripts/apply-sql.mjs --query "select count(*) from public.profiles;"
 *
 * Safe to commit: reads secrets from .env.local (gitignored), nothing hardcoded.
 */
import { readFileSync } from 'node:fs';
import pg from 'pg';
import { config } from 'dotenv';

config({ path: '.env.local' });

const args0 = process.argv.slice(2);
function flag(name) {
  const i = args0.indexOf(name);
  return i !== -1 ? args0[i + 1] : undefined;
}

// The direct DB host (db.<ref>.supabase.co) is IPv6-only; on IPv4 networks use
// the regional pooler instead: --host aws-0-<region>.pooler.supabase.com
// --user postgres.<ref>. Falls back to the SUPABASE_DB_* direct values.
const host = flag('--host') || process.env.SUPABASE_DB_HOST;
const port = Number(flag('--port') || process.env.SUPABASE_DB_PORT || 5432);
const database = process.env.SUPABASE_DB_NAME || 'postgres';
const user = flag('--user') || process.env.SUPABASE_DB_USER;
const password = process.env.SUPABASE_DB_PASSWORD;

if (!host || !user || !password) {
  console.error('Missing SUPABASE_DB_HOST / SUPABASE_DB_USER / SUPABASE_DB_PASSWORD in .env.local');
  process.exit(1);
}

// Strip the --host/--port/--user/--query flags (and their values) so the
// remaining positional arg is the SQL file path.
const FLAGS_WITH_VALUES = ['--host', '--port', '--user', '--query'];
const positional = [];
for (let i = 0; i < args0.length; i++) {
  if (FLAGS_WITH_VALUES.includes(args0[i])) {
    i++; // skip the flag's value too
    continue;
  }
  positional.push(args0[i]);
}

const queryIdx = args0.indexOf('--query');
let sql;
let label;
if (queryIdx !== -1) {
  sql = args0[queryIdx + 1];
  label = '(inline query)';
} else {
  const file = positional[0];
  if (!file) {
    console.error('Usage: node scripts/apply-sql.mjs <file.sql> | --query "<sql>"');
    process.exit(1);
  }
  sql = readFileSync(file, 'utf8');
  label = file;
}

const client = new pg.Client({
  host,
  port,
  database,
  user,
  password,
  ssl: { rejectUnauthorized: false },
});

const isSelect = /^\s*select/i.test(sql);

try {
  await client.connect();
  console.log(`Connected to ${host}:${port}/${database} as ${user}`);
  if (isSelect && queryIdx !== -1) {
    const res = await client.query(sql);
    console.table(res.rows);
  } else {
    await client.query('begin');
    await client.query(sql);
    await client.query('commit');
    console.log(`✓ Applied ${label} (committed).`);
  }
} catch (err) {
  try {
    await client.query('rollback');
  } catch {
    /* ignore */
  }
  console.error(`✗ Failed to apply ${label}:`);
  console.error(err.message);
  process.exit(1);
} finally {
  await client.end();
}
