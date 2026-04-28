#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Backup script for ScopusResume.
 *
 * Snapshots all rows from the existing project tables to a single timestamped
 * JSON file under backups/. Run this BEFORE any destructive migration or
 * backfill operation.
 *
 * Required env (loaded from .env.local automatically):
 *   DATABASE_URL — Supabase Postgres connection URI.
 *
 * Usage:
 *   node scripts/db/backup.js
 */

const fs = require('fs');
const path = require('path');

try {
  require('dotenv').config({ path: path.resolve(__dirname, '../../.env.local') });
} catch (_) {
  // optional
}

let Client;
try {
  ({ Client } = require('pg'));
} catch (err) {
  console.error('[backup] Missing dependency: `pg`. Run `npm install` first.');
  process.exit(1);
}

const TABLES = ['resumes', 'resume_versions', 'ats_scores', 'job_analyses', 'export_history'];
const BACKUP_DIR = path.resolve(__dirname, '../../backups');

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  );
}

(async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error(
      '[backup] DATABASE_URL is not set.\n' +
        '  Add it to .env.local. You can find it in Supabase Dashboard\n' +
        '  -> Project Settings -> Database -> Connection string -> URI.'
    );
    process.exit(1);
  }

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
  } catch (err) {
    console.error('[backup] Failed to connect to database:');
    console.error(err.message || err);
    process.exit(1);
  }

  const snapshot = {
    backed_up_at: new Date().toISOString(),
    database_url_host: (() => {
      try {
        return new URL(databaseUrl).host;
      } catch (_) {
        return 'unknown';
      }
    })(),
    tables: {},
  };

  try {
    for (const table of TABLES) {
      try {
        const { rows } = await client.query(`SELECT * FROM ${table}`);
        snapshot.tables[table] = rows;
        console.log(`[backup] ${table}: ${rows.length} row(s)`);
      } catch (err) {
        console.error(`[backup] Failed to read ${table}: ${err.message || err}`);
        process.exit(1);
      }
    }

    const filename = `supabase-${timestamp()}.json`;
    const fullPath = path.join(BACKUP_DIR, filename);
    fs.writeFileSync(fullPath, JSON.stringify(snapshot, null, 2));
    const sizeKb = (fs.statSync(fullPath).size / 1024).toFixed(1);
    console.log(`[backup] Wrote ${fullPath} (${sizeKb} KB)`);
  } finally {
    await client.end();
  }
})();
