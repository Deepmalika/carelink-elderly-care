# CareLink — Elderly Nursing & Healthcare Assistance Platform

A full-stack web platform connecting senior citizens and their families with verified healthcare
professionals (nurses, elderly attendants, physiotherapists, and post-hospital care specialists)
for in-home medical and non-medical assistance.

It supports three roles:
- **Family / Elderly users** — create patient profiles, browse services, book verified caregivers, track visits, rate completed care
- **Caregivers (Service Agents)** — manage their profile & availability, accept/reject requests, update visit status, add care notes, view earnings & history
- **Admins** — verify/onboard caregivers, manage the service catalog, view users, monitor platform KPIs, and moderate reviews and care notes

## Live demo

**https://carelink-elderly-care.vercel.app/**

Log in with any of the demo accounts below to explore each role:

| Role      | Email                          | Password      |
|-----------|---------------------------------|--------------|
| Family    | kavita.family@carelink.com       | family123    |
| Caregiver | anita.caregiver@carelink.com     | caregiver123 |
| Admin     | admin@carelink.com               | admin123     |

Worth trying: as **family**, describe a situation on the triage page and book a recommended
caregiver; as **caregiver**, accept a request and add a care note; as **admin**, check the
KPI dashboard, the sentiment-flagged items, and the moderation page.

A few things to know:
- **The first load can take up to a minute.** The backend and ML service run on free-tier
  hosting that sleeps when idle, so the first request after a quiet period has to wake them.
  After that it's fast.
- **Please use the demo accounts rather than registering with real personal details.**
  These are shared, public logins on a demo database, and the admin account can see every
  registered user's name, email, and phone number.
- **Demo data is disposable** and may be reset at any time.

## Stack

| Layer     | Technology |
|-----------|------------|
| Frontend  | React (Vite) + React Router + Tailwind CSS + Axios |
| Backend   | Node.js + Express (REST API) |
| Database  | PostgreSQL (via `pg`), hosted on Supabase |
| Auth      | JWT (JSON Web Tokens), bcrypt password hashing |
| ML service | Python + FastAPI + scikit-learn (triage, sentiment, and recommendation models) |
| Hosting   | Vercel (frontend), Render (backend + ML service), Supabase (database) |

**A note on the database:** this started on SQLite (via `better-sqlite3`) for zero-setup local
development, then migrated to PostgreSQL for deployment — SQLite's single-file database doesn't
survive restarts/redeploys on most hosting platforms without paying for persistent disk, whereas
a managed Postgres (Supabase, Neon, etc.) has a genuinely free tier and is the more standard
choice for a deployed app. `backend/src/db/index.js` wraps `pg` in a thin `prepare(sql).get/all/run()`
shim matching `better-sqlite3`'s API shape, so the rest of the codebase reads almost the same as
before — the main visible difference is every call site is now `await`ed, since Postgres has no
synchronous driver.

## AI features

**1. Care-need triage assistant** — a family describes their situation in plain language
(e.g. "dad just came home from hip surgery and needs help walking") and gets a suggested
service category, powered by a trained ML model (TF-IDF + Logistic Regression, ~92%
cross-validation accuracy) rather than hardcoded rules.

**2. Caregiver recommendation engine** — when booking, verified caregivers are ranked for
the specific patient using content-based matching: TF-IDF similarity between the patient's
described needs and each caregiver's profile/qualifications, blended with their rating and
years of experience. Falls back to the plain unranked list if the ML service is unavailable.

**3. Sentiment analysis on reviews & care notes** — every rating comment and care note is
automatically scored (Positive / Negative / Neutral) by a trained classifier the moment it's
submitted. Negative-sentiment items surface on a dedicated admin page (`/admin/sentiment`)
so concerning feedback gets noticed even when a star rating alone wouldn't flag it. Admins
can also browse every review and care note (`/admin/moderation`) and remove any of them, and
families can delete their own reviews.

**A note on scope:** the models are trained on small, hand-curated datasets (roughly 100
examples per model), so this is a working proof of concept rather than a production-grade
classifier — it can misjudge unusual phrasing. The app is built so that never blocks anything:
if the ML service is down or unsure, triage shows a friendly message, recommendations fall
back to an unranked list, and reviews save without a sentiment tag.

See `ml-service/README.md` for details on all three models and how to retrain them. None of
this is a medical diagnosis tool — it's routing/matching/monitoring assistance only.

## Project structure

```
carelink-elderly-care-platform/
├── .github/workflows/
│   └── keep-alive.yml          # scheduled ping so the free-tier database doesn't pause
├── ml-service/
│   ├── data/                    # training examples (triage + sentiment)
│   ├── model/                   # trained models saved here after training
│   ├── train.py                 # trains the triage classifier
│   ├── train_sentiment.py       # trains the sentiment classifier
│   ├── app.py                   # FastAPI app: /predict, /analyze-sentiment, /recommend-caregivers
│   └── requirements.txt
├── backend/
│   ├── src/
│   │   ├── db/            # schema.sql, connection, seed script, inspect script
│   │   ├── middleware/     # JWT auth + role guards
│   │   ├── routes/         # auth, patients, services, caregivers, bookings, admin, triage
│   │   ├── utils/          # id generation, password hashing, ML service client
│   │   └── server.js
│   └── package.json
└── frontend/
    ├── src/
    │   ├── pages/           # Landing, Login, Register, Services, Triage, BookingDetail, family/, caregiver/, admin/
    │   ├── components/      # Navbar, ProtectedRoute, StatusBadge, SentimentBadge, Spinner, Feedback
    │   ├── context/          # AuthContext
    │   └── lib/               # api client, formatting helpers
    └── package.json
```

## Getting started (running locally)

You'll run three things, each in its own terminal: the ML service, the backend, and the frontend.

### 1. ML service

```bash
cd ml-service
python -m venv venv
source venv/bin/activate          # on Windows: venv\Scripts\activate
pip install -r requirements.txt
python train.py                   # trains the triage model
python train_sentiment.py         # trains the sentiment model
uvicorn app:app --host 0.0.0.0 --port 8001 --reload
```

The trained models are saved to `ml-service/model/`. If you edit anything in `data/`, re-run
the matching training script and restart the service — `--reload` only watches code, not the
saved model files.

### 2. Backend

Requires a Postgres database — a free [Supabase](https://supabase.com) project works well for
local dev too, or point `DATABASE_URL` at a local Postgres if you have one installed.

```bash
cd backend
npm install
cp .env.example .env    # then fill in your DATABASE_URL and JWT_SECRET
npm run seed             # creates the schema, sample services, and demo accounts
npm run dev               # starts the API on http://localhost:4000 (nodemon, auto-restarts)
```

Environment variables go in `backend/.env` (see `.env.example` for the full list and where to
get a Supabase connection string):

```
DATABASE_URL="postgresql://user:password@host:5432/dbname"
JWT_SECRET="change-me-to-a-long-random-string"
PORT=4000
ML_SERVICE_URL="http://localhost:8001"
```

### 3. Frontend

In another terminal:

```bash
cd frontend
npm install
npm run dev      # starts the Vite dev server on http://localhost:5173
```

`frontend/.env` points the frontend at the backend:

```
VITE_API_URL=http://localhost:4000/api
```

Open **http://localhost:5173** in your browser.

### Demo accounts (created by `npm run seed`)

`npm run seed` creates the same demo accounts listed in [Live demo](#live-demo), plus a
second caregiver, `suresh.caregiver@carelink.com` / `caregiver123`, whose profile is
**unverified** so the admin verification queue has something to show. The demo family account
already has one patient profile (Mohan Rao) so you can try the booking flow immediately.

When running locally with `npm run dev`, the login page also displays these accounts in a
box (`Login.jsx` gates it behind `import.meta.env.DEV`, so it's stripped out of production
builds).

### Looking at the database directly

- **No extra install**: `cd backend && npm run db:inspect` prints every table to the console
  (or `npm run db:inspect bookings` for just one table).
- **GUI**: Supabase's own dashboard has a Table Editor and SQL editor built in — no separate
  tool needed if you're using a Supabase project.
- **Any Postgres client**: TablePlus, pgAdmin, DBeaver, or the `psql` CLI all work with the
  same `DATABASE_URL` connection string.

## Features

**Family / elderly users**
- Registration & login, patient profile creation
- Browse services and book a verified caregiver, with AI triage and caregiver recommendations
- View booking history, add care notes, rate completed visits, and delete their own reviews

**Caregivers**
- Registration, profile management, and verification by an admin
- Manage availability and service areas
- Accept or reject requests, update visit status, add care notes
- View earnings and work history

**Admins**
- Verify and onboard caregivers, manage the service catalog, view users
- KPI dashboard (`GET /api/admin/analytics`): registered users, verified caregivers, booking
  completion rate, average caregiver response time, satisfaction score (from ratings), and
  monthly active users
- Review sentiment-flagged feedback and moderate every review and care note

**Engineering highlights**
- **Security:** JWT auth, bcrypt-hashed passwords, role-based route guards on both API and
  frontend, and server-side ownership checks (e.g. a family member can only delete their own
  review)
- **Usability:** large, high-contrast, plain-language UI aimed at being easy for families (and
  less tech-savvy users) to navigate
- **Scalability:** stateless REST API backed by a managed Postgres database (Supabase), so the
  backend itself can be scaled horizontally without any local-file state to worry about
- **Resilience:** the ML service is optional at runtime — every feature that uses it degrades
  gracefully instead of failing when it's unavailable

**Data model:** Users, Patients, Caregivers, Services, Bookings, and Care Notes.

**Not included (possible future work):** native mobile apps, direct hospital system
integration, emergency ambulance services, dispute handling, online payments,
tele-consultation, medication reminders, and an SOS feature.

## API overview

All endpoints are prefixed with `/api`. Protected endpoints require `Authorization: Bearer <token>`.

- `POST /auth/register`, `POST /auth/login`, `GET /auth/me`
- `GET /services`, `GET /services/:id`, `POST/PUT/DELETE /services/:id` (admin)
- `GET /caregivers`, `GET /caregivers/me`, `PUT /caregivers/me`, `PATCH /caregivers/:id/verify` (admin), `GET /caregivers/me/history`
- `GET /caregivers/recommend?patientId=...&category=...` — family only; ranks verified caregivers for a specific patient using the ML recommendation engine
- `POST /patients`, `GET /patients/mine`, `GET/PUT /patients/:id`
- `POST /bookings`, `GET /bookings/mine`, `GET /bookings/:id`, `PATCH /bookings/:id/accept|reject|status|rate`
- `DELETE /bookings/:id/review` — the review's author (family) or an admin
- `POST/GET /bookings/:id/notes`, `DELETE /bookings/:id/notes/:noteId` — the note's author or an admin
- `GET /admin/users`, `GET /admin/caregivers`, `GET /admin/caregivers/pending`, `GET /admin/analytics`
- `GET /admin/sentiment-flags` — negative-sentiment ratings and care notes for review
- `GET /admin/reviews`, `GET /admin/care-notes` — every review and care note, for moderation
- `POST /triage` — public; body `{ "description": "..." }`, proxies to the ML service and returns
  a suggested category plus matching services (returns a 503 with a friendly message if the ML
  service isn't running)

## Deployment

The live demo runs on free tiers of three services:

| Piece | Host | Notes |
|-------|------|-------|
| Database | Supabase (Postgres) | Schema is created automatically on first backend start (`db.init()`) |
| ML service | Render (web service) | Root directory `ml-service`; build `pip install -r requirements.txt && python train.py && python train_sentiment.py`; start `uvicorn app:app --host 0.0.0.0 --port $PORT` |
| Backend | Render (web service) | Root directory `backend`; build `npm install`; start `npm run start` |
| Frontend | Vercel | Root directory `frontend`; framework preset Vite |

**Backend environment variables:**
- `DATABASE_URL` — the Supabase connection string
- `JWT_SECRET` — a long random secret (generate one with
  `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
- `ML_SERVICE_URL` — the deployed ML service's URL
- `FRONTEND_URL` — the deployed frontend's URL; locks CORS down to just that origin

**Frontend environment variable:** `VITE_API_URL` — the deployed backend's URL plus `/api`.

**Gotchas worth knowing:**
- **No trailing slashes** in `FRONTEND_URL` or `ML_SERVICE_URL`. CORS compares the origin as an
  exact string, so `https://example.com/` does not match `https://example.com`.
- **Free-tier services sleep when idle.** Render's free web services spin down after about 15
  minutes without traffic and take up to a minute to wake, which is why the first request after
  a quiet period is slow. Supabase's free tier pauses a project after about a week of
  inactivity, so `.github/workflows/keep-alive.yml` calls a database-backed backend route twice
  a week to keep it active.
- **Demo credentials are hidden in production builds.** The dev-only credentials box on the
  login page is removed by Vite at build time, not just hidden with CSS.
- **The demo accounts are public on purpose** (see [Live demo](#live-demo)) so visitors can
  try every role. Don't put real personal data in the database behind a public demo.
