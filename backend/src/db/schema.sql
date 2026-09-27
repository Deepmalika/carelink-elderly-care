-- Elderly Nursing & Healthcare Assistance Platform — database schema
-- (Postgres. Timestamps are stored as TEXT in SQLite's original
-- 'YYYY-MM-DD HH:MI:SS' UTC format — not native Postgres TIMESTAMP — so the
-- rest of the app, which treats these as plain strings, needed no changes.)

CREATE TABLE IF NOT EXISTS users (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL UNIQUE,
  password   TEXT NOT NULL,
  phone      TEXT,
  role       TEXT NOT NULL CHECK (role IN ('FAMILY','CAREGIVER','ADMIN')),
  created_at TEXT NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD HH24:MI:SS'))
);

CREATE TABLE IF NOT EXISTS patients (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  age           INTEGER NOT NULL,
  gender        TEXT,
  medical_needs TEXT,
  address       TEXT,
  owner_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at    TEXT NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD HH24:MI:SS'))
);

CREATE TABLE IF NOT EXISTS caregivers (
  id               TEXT PRIMARY KEY,
  user_id          TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  qualification    TEXT NOT NULL,
  experience_years INTEGER NOT NULL DEFAULT 0,
  bio              TEXT,
  service_areas    TEXT,
  availability     TEXT,
  categories       TEXT NOT NULL DEFAULT '',
  verified         INTEGER NOT NULL DEFAULT 0,
  rating_average   REAL NOT NULL DEFAULT 0,
  rating_count     INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD HH24:MI:SS'))
);

CREATE TABLE IF NOT EXISTS services (
  id                     TEXT PRIMARY KEY,
  name                   TEXT NOT NULL,
  description            TEXT,
  category               TEXT NOT NULL CHECK (category IN ('NURSING_CARE','ELDERLY_ATTENDANT','PHYSIOTHERAPY','POST_HOSPITAL_CARE')),
  duration_minutes       INTEGER NOT NULL DEFAULT 60,
  price                  REAL NOT NULL,
  required_qualification TEXT,
  active                 INTEGER NOT NULL DEFAULT 1,
  created_at             TEXT NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD HH24:MI:SS'))
);

CREATE TABLE IF NOT EXISTS bookings (
  id             TEXT PRIMARY KEY,
  scheduled_date TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'PENDING'
                 CHECK (status IN ('PENDING','ACCEPTED','REJECTED','IN_PROGRESS','COMPLETED','CANCELLED')),
  rating_score   INTEGER,
  rating_comment TEXT,
  patient_id     TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  caregiver_id   TEXT NOT NULL REFERENCES caregivers(id) ON DELETE CASCADE,
  service_id     TEXT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  created_at     TEXT NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD HH24:MI:SS')),
  updated_at     TEXT NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD HH24:MI:SS'))
);

CREATE TABLE IF NOT EXISTS care_notes (
  id         TEXT PRIMARY KEY,
  note       TEXT NOT NULL,
  booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  author_id  TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD HH24:MI:SS'))
);

CREATE INDEX IF NOT EXISTS idx_patients_owner ON patients(owner_id);
CREATE INDEX IF NOT EXISTS idx_bookings_patient ON bookings(patient_id);
CREATE INDEX IF NOT EXISTS idx_bookings_caregiver ON bookings(caregiver_id);
CREATE INDEX IF NOT EXISTS idx_bookings_service ON bookings(service_id);
CREATE INDEX IF NOT EXISTS idx_care_notes_booking ON care_notes(booking_id);
