const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required. Set it to your Postgres connection string (see .env.example).');
}

// Supabase (and most managed Postgres hosts) require SSL, but ship a
// certificate chain that Node's default strict verification can reject in
// some environments. Disabling verification here is the common pattern for
// these hosts; skip it entirely against a local Postgres (no sslmode).
const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('localhost') || connectionString.includes('127.0.0.1')
    ? false
    : { rejectUnauthorized: false },
});

// Translates SQLite's positional `?` placeholders (used throughout the
// route files) into Postgres's `$1, $2, ...` — lets query strings stay as
// they were written instead of needing every call site hand-converted.
function toPgSql(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

// Mirrors the subset of better-sqlite3's `db.prepare(sql).get/all/run(...)`
// API this codebase actually uses, but async (Postgres has no sync driver).
// Callers need `await` added at each call site; the SQL strings themselves
// don't need to change.
function prepare(sql) {
  const pgSql = toPgSql(sql);
  return {
    async get(...params) {
      const result = await pool.query(pgSql, params);
      return result.rows[0];
    },
    async all(...params) {
      const result = await pool.query(pgSql, params);
      return result.rows;
    },
    async run(...params) {
      const result = await pool.query(pgSql, params);
      return { changes: result.rowCount };
    },
  };
}

async function exec(sql) {
  await pool.query(sql);
}

// Adds a column if it doesn't already exist — safe to call every startup.
// Postgres supports `ADD COLUMN IF NOT EXISTS` directly, so this is simpler
// than the SQLite version's manual PRAGMA table_info check.
async function ensureColumn(table, column, definition) {
  await exec(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${definition}`);
}

async function init() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await exec(schema);

  await ensureColumn('bookings', 'sentiment_label', 'TEXT');
  await ensureColumn('bookings', 'sentiment_score', 'REAL');
  await ensureColumn('care_notes', 'sentiment_label', 'TEXT');
  await ensureColumn('care_notes', 'sentiment_score', 'REAL');
}

module.exports = { prepare, exec, init, pool };
