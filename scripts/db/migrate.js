#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Migration runner for ScopusResume.
 *
 * Reads .sql files from supabase/migrations/ in lexicographic order and
 * applies any that have not yet been recorded in the `_migrations` tracking
 * table. Each file runs inside its own BEGIN/COMMIT transaction; on failure,
 * the transaction is rolled back and the runner exits non-zero.
 *
 * Required env (loaded from .env.local automatically):
 *   DATABASE_URL — Supabase Postgres connection URI. Found in
 *     Supabase Dashboard → Project Settings → Database → Connection string → URI
 *
 * Usage:
 *   node scripts/db/migrate.js            # apply all pending migrations
 *   node scripts/db/migrate.js --status   # print applied vs pending; apply nothing
 */

const fs = require('fs');
const path = require('path');

// Load .env.local if dotenv is available. Don't hard-fail if it isn't —
// DATABASE_URL may already be in the shell env.
try {
  require('dotenv').config({ path: path.resolve(__dirname, '../../.env.local') });
} catch (_) {
  // dotenv is optional here; we'll fail later with a clearer message if
  // DATABASE_URL is still missing.
}

let Client;
try {
  ({ Client } = require('pg'));
} catch (err) {
  console.error('[migrate] Missing dependency: `pg`. Run `npm install` first.');
  process.exit(1);
}

const MIGRATIONS_DIR = path.resolve(__dirname, '../../supabase/migrations');

function listMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.error(`[migrate] Migrations directory not found: ${MIGRATIONS_DIR}`);
    process.exit(1);
  }
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
}

async function ensureTrackingTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      filename   TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

async function getApplied(client) {
  const { rows } = await client.query('SELECT filename FROM _migrations ORDER BY filename');
  return new Set(rows.map((r) => r.filename));
}

async function runStatus(client) {
  await ensureTrackingTable(client);
  const applied = await getApplied(client);
  const all = listMigrationFiles();
  const pending = all.filter((f) => !applied.has(f));

  console.log('\n=== Migration status ===');
  console.log(`Applied (${applied.size}):`);
  for (const f of all.filter((f) => applied.has(f))) console.log(`  [x] ${f}`);
  console.log(`\nPending (${pending.length}):`);
  for (const f of pending) console.log(`  [ ] ${f}`);
  console.log('');
}

async function runMigrations(client) {
  await ensureTrackingTable(client);
  const applied = await getApplied(client);
  const all = listMigrationFiles();
  const pending = all.filter((f) => !applied.has(f));

  if (pending.length === 0) {
    console.log('[migrate] No pending migrations. Database is up to date.');
    return;
  }

  console.log(`[migrate] Applying ${pending.length} migration(s)...`);
  for (const filename of pending) {
    const fullPath = path.join(MIGRATIONS_DIR, filename);
    const sql = fs.readFileSync(fullPath, 'utf8');
    process.stdout.write(`  -> ${filename} ... `);
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO _migrations (filename) VALUES ($1)', [filename]);
      await client.query('COMMIT');
      console.log('OK');
    } catch (err) {
      try {
        await client.query('ROLLBACK');
      } catch (_) {
        // ignore rollback errors
      }
      console.log('FAILED');
      console.error(`\n[migrate] Error applying ${filename}:`);
      console.error(err.message || err);
      process.exit(1);
    }
  }
  console.log('[migrate] All pending migrations applied successfully.');
}

(async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error(
      '[migrate] DATABASE_URL is not set.\n' +
        '  Add it to .env.local. You can find it in Supabase Dashboard\n' +
        '  -> Project Settings -> Database -> Connection string -> URI.'
    );
    process.exit(1);
  }

  const statusOnly = process.argv.includes('--status');
  const client = new Client({
    connectionString: databaseUrl,
    // Supabase requires SSL; the URI usually includes ?sslmode=require but
    // we set it explicitly here so it works even with older URI formats.
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
  } catch (err) {
    console.error('[migrate] Failed to connect to database:');
    console.error(err.message || err);
    process.exit(1);
  }

  try {
    if (statusOnly) {
      await runStatus(client);
    } else {
      await runMigrations(client);
    }
  } finally {
    await client.end();
  }
})();
