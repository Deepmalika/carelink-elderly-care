// One-time migration: copies every row out of an old better-sqlite3 database
// (e.g. data.db / dev.db from local development) into the Postgres database
// pointed to by DATABASE_URL.
//
// Usage:
//   node src/db/migrate-from-sqlite.js path/to/data.db
//   (defaults to ./data.db, then ./dev.db, if no path is given)
//
// Why this isn't a plain row-by-row copy: `npm run seed` generates a fresh
// random ID for each demo account every time it runs, so "Anita Sharma" in
// your local data.db and "Anita Sharma" in a separately-seeded Supabase
// database are the same person by email, but have two different ids. A
// naive copy would skip re-inserting her user row (since her email already
// exists) but then try to insert her caregiver profile pointing at her OLD
// local id — which doesn't exist in the target — breaking the foreign key.
// This script tracks "this local id actually maps to this target id" for
// every users/caregivers row (the only two tables with an identity beyond
// their own primary key) and rewrites foreign keys as it goes, so every
// dependent row ends up pointing at the correct target row for the same
// real person, not a dangling local id.
//
// Safe to re-run: matches by the same rules every time, so re-running finds
// the same existing target rows and skips them again rather than duplicating.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const pg = require('./index');

function resolveSqlitePath(argPath) {
  if (argPath) return argPath;
  const candidates = ['data.db', 'dev.db'];
  for (const c of candidates) {
    if (fs.existsSync(path.join(process.cwd(), c))) return c;
  }
  return null;
}

function tableExists(sqliteDb, table) {
  return !!sqliteDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table);
}

async function migrateUsers(sqliteDb) {
  const idMap = new Map();
  if (!tableExists(sqliteDb, 'users')) return idMap;

  const rows = sqliteDb.prepare('SELECT * FROM users').all();
  let inserted = 0;
  for (const row of rows) {
    const existing = await pg.pool.query('SELECT id FROM users WHERE email = $1', [row.email]);
    if (existing.rows.length > 0) {
      idMap.set(row.id, existing.rows[0].id);
      continue;
    }
    await pg.pool.query(
      `INSERT INTO users (id, name, email, password, phone, role, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,
      [row.id, row.name, row.email, row.password, row.phone, row.role, row.created_at]
    );
    idMap.set(row.id, row.id);
    inserted++;
  }
  console.log(`  users: ${inserted} copied, ${rows.length - inserted} already present (matched by email)`);
  return idMap;
}

async function migrateCaregivers(sqliteDb, userIdMap) {
  const idMap = new Map();
  if (!tableExists(sqliteDb, 'caregivers')) return idMap;

  const rows = sqliteDb.prepare('SELECT * FROM caregivers').all();
  let inserted = 0;
  for (const row of rows) {
    const targetUserId = userIdMap.get(row.user_id) || row.user_id;
    const existing = await pg.pool.query('SELECT id FROM caregivers WHERE user_id = $1', [targetUserId]);
    if (existing.rows.length > 0) {
      idMap.set(row.id, existing.rows[0].id);
      continue;
    }
    await pg.pool.query(
      `INSERT INTO caregivers (id, user_id, qualification, experience_years, bio, service_areas,
       availability, categories, verified, rating_average, rating_count, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT DO NOTHING`,
      [row.id, targetUserId, row.qualification, row.experience_years, row.bio, row.service_areas,
       row.availability, row.categories, row.verified, row.rating_average, row.rating_count, row.created_at]
    );
    idMap.set(row.id, row.id);
    inserted++;
  }
  console.log(`  caregivers: ${inserted} copied, ${rows.length - inserted} already present (matched by user)`);
  return idMap;
}

async function migrateServices(sqliteDb) {
  if (!tableExists(sqliteDb, 'services')) return;
  const rows = sqliteDb.prepare('SELECT * FROM services').all();
  let inserted = 0;
  for (const row of rows) {
    const result = await pg.pool.query(
      `INSERT INTO services (id, name, description, category, duration_minutes, price,
       required_qualification, active, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT DO NOTHING`,
      [row.id, row.name, row.description, row.category, row.duration_minutes, row.price,
       row.required_qualification, row.active, row.created_at]
    );
    if (result.rowCount > 0) inserted++;
  }
  console.log(`  services: ${inserted} copied, ${rows.length - inserted} already present`);
}

async function migratePatients(sqliteDb, userIdMap) {
  if (!tableExists(sqliteDb, 'patients')) return;
  const rows = sqliteDb.prepare('SELECT * FROM patients').all();
  let inserted = 0;
  for (const row of rows) {
    const ownerId = userIdMap.get(row.owner_id) || row.owner_id;
    const result = await pg.pool.query(
      `INSERT INTO patients (id, name, age, gender, medical_needs, address, owner_id, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING`,
      [row.id, row.name, row.age, row.gender, row.medical_needs, row.address, ownerId, row.created_at]
    );
    if (result.rowCount > 0) inserted++;
  }
  console.log(`  patients: ${inserted} copied, ${rows.length - inserted} already present`);
}

async function migrateBookings(sqliteDb, caregiverIdMap) {
  if (!tableExists(sqliteDb, 'bookings')) return;
  const rows = sqliteDb.prepare('SELECT * FROM bookings').all();
  let inserted = 0;
  for (const row of rows) {
    const caregiverId = caregiverIdMap.get(row.caregiver_id) || row.caregiver_id;
    const result = await pg.pool.query(
      `INSERT INTO bookings (id, scheduled_date, status, rating_score, rating_comment,
       patient_id, caregiver_id, service_id, created_at, updated_at, sentiment_label, sentiment_score)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT DO NOTHING`,
      [row.id, row.scheduled_date, row.status, row.rating_score, row.rating_comment,
       row.patient_id, caregiverId, row.service_id, row.created_at, row.updated_at,
       row.sentiment_label, row.sentiment_score]
    );
    if (result.rowCount > 0) inserted++;
  }
  console.log(`  bookings: ${inserted} copied, ${rows.length - inserted} already present`);
}

async function migrateCareNotes(sqliteDb, userIdMap) {
  if (!tableExists(sqliteDb, 'care_notes')) return;
  const rows = sqliteDb.prepare('SELECT * FROM care_notes').all();
  let inserted = 0;
  for (const row of rows) {
    const authorId = userIdMap.get(row.author_id) || row.author_id;
    const result = await pg.pool.query(
      `INSERT INTO care_notes (id, note, booking_id, author_id, created_at, sentiment_label, sentiment_score)
       VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,
      [row.id, row.note, row.booking_id, authorId, row.created_at, row.sentiment_label, row.sentiment_score]
    );
    if (result.rowCount > 0) inserted++;
  }
  console.log(`  care_notes: ${inserted} copied, ${rows.length - inserted} already present`);
}

async function main() {
  const sqlitePath = resolveSqlitePath(process.argv[2]);
  if (!sqlitePath || !fs.existsSync(sqlitePath)) {
    console.error('Could not find a SQLite database file.');
    console.error('Usage: node src/db/migrate-from-sqlite.js path/to/data.db');
    process.exit(1);
  }

  console.log(`Reading from: ${path.resolve(sqlitePath)}`);
  const sqliteDb = new Database(sqlitePath, { readonly: true });

  console.log('Ensuring Postgres schema exists...');
  await pg.init();

  console.log('Migrating tables...');
  const userIdMap = await migrateUsers(sqliteDb);
  await migrateServices(sqliteDb);
  const caregiverIdMap = await migrateCaregivers(sqliteDb, userIdMap);
  await migratePatients(sqliteDb, userIdMap);
  await migrateBookings(sqliteDb, caregiverIdMap);
  await migrateCareNotes(sqliteDb, userIdMap);

  sqliteDb.close();
  console.log('\nDone.');
  await pg.pool.end();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});