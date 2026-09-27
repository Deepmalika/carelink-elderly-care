# CareLink — Elderly Nursing & Healthcare Assistance Platform

A full-stack implementation of the PRD: a web portal connecting senior citizens and their
families with verified healthcare professionals (nurses, elderly attendants, physiotherapists,
and post-hospital care specialists) for in-home medical and non-medical assistance.

Built with three roles, exactly as specified in the PRD:
- **Family / Elderly users** — create patient profiles, browse services, book verified caregivers, track visits, rate completed care
- **Caregivers (Service Agents)** — manage their profile & availability, accept/reject requests, update visit status, add care notes, view earnings & history
- **Admins** — verify/onboard caregivers, manage the service catalog, view users, and monitor platform KPIs

## Stack

| Layer     | Technology |
|-----------|------------|
| Frontend  | React (Vite) + React Router + Tailwind CSS + Axios |
| Backend   | Node.js + Express (REST API) |
| Database  | PostgreSQL (via `pg`) — a free-tier Supabase project works well |
| Auth      | JWT (JSON Web Tokens), bcrypt password hashing |
| ML service | Python + FastAPI + scikit-learn (care-need triage classifier) |

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
so concerning feedback gets noticed even when a star rating alone wouldn't flag it.

See `ml-service/README.md` for details on all three models and how to retrain them. None of
this is a medical diagnosis tool — it's routing/matching/monitoring assistance only.

## Project structure

```
project/
├── ml-service/
│   ├── data/training_data.py   # curated training examples per category
│   ├── model/                   # trained model saved here after `python train.py`
│   ├── train.py
│   ├── app.py                   # FastAPI app exposing POST /predict
│   └── requirements.txt
├── backend/
│   ├── src/
│   │   ├── db/            # schema.sql, connection, seed script, inspect script
│   │   ├── middleware/     # JWT auth + role guards
│   │   ├── routes/         # auth, patients, services, caregivers, bookings, admin, triage
│   │   └── server.js
│   └── package.json
└── frontend/
    ├── src/
    │   ├── pages/           # Landing, Login, Register, Services, Triage, BookingDetail, family/, caregiver/, admin/
    │   ├── components/      # Navbar, ProtectedRoute, StatusBadge, Spinner, Feedback
    │   ├── context/          # AuthContext
    │   └── lib/               # api client, formatting helpers
    └── package.json
```

## Getting started

You'll run three things, each in its own terminal: the ML service, the backend, and the frontend.

### 1. ML service

```bash
cd ml-service
python3 -m venv venv && source venv/bin/activate   # optional but recommended
pip install -r requirements.txt
python train.py                                     # trains and saves the model (only needed once)
uvicorn app:app --host 0.0.0.0 --port 8001 --reload
```

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
JWT_SECRET="elderly-care-dev-secret-change-in-production"
PORT=4000
ML_SERVICE_URL="http://localhost:8001"
```

### 3. Frontend

In a second terminal:

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

| Role      | Email                          | Password      |
|-----------|---------------------------------|--------------|
| Admin     | admin@carelink.com               | admin123     |
| Family    | kavita.family@carelink.com       | family123    |
| Caregiver (verified) | anita.caregiver@carelink.com | caregiver123 |
| Caregiver (pending)  | suresh.caregiver@carelink.com | caregiver123 |

The demo family account already has one patient profile (Mohan Rao) so you can immediately try
the booking flow. The unverified caregiver (Suresh) is there so you can try the admin
verification queue. These credentials are shown in the app itself only in dev mode (`Login.jsx`
gates the box behind `import.meta.env.DEV`) — they're stripped out of the production build.

### Looking at the database directly

- **No extra install**: `cd backend && npm run db:inspect` prints every table to the console
  (or `npm run db:inspect bookings` for just one table).
- **GUI**: Supabase's own dashboard has a Table Editor and SQL editor built in — no separate
  tool needed if you're using a Supabase project.
- **Any Postgres client**: TablePlus, pgAdmin, DBeaver, or the `psql` CLI all work with the
  same `DATABASE_URL` connection string.

## What's implemented (mapped to the PRD)

**Functional requirements**
- User (family/elderly) features: registration & login, patient profile creation, browsing
  services, booking a caregiver, viewing service/booking history
- Service agent (caregiver) features: registration & verification, managing availability/service
  areas, accepting/rejecting requests, updating status & care notes, viewing earnings/work history
- Admin features: verifying/onboarding caregivers, managing services, viewing users, viewing
  analytics/KPIs, (dispute handling is left as a future enhancement — see below)

**Non-functional requirements**
- Security: JWT auth, bcrypt-hashed passwords, role-based route guards on both API and frontend
- Usability: large, high-contrast, plain-language UI aimed at being easy for families (and less
  tech-savvy users) to navigate
- Scalability: stateless REST API backed by a managed Postgres database (Supabase), so the
  backend itself can be scaled horizontally without any local-file state to worry about

**Data model**: Users, Patients, Caregivers, Services, Bookings, Care Notes — matching the PRD's
"Core Entities" list exactly.

**KPIs** (`GET /api/admin/analytics`): registered users, verified caregivers, booking completion
rate, average caregiver response time, satisfaction score (from ratings), monthly active users.

**Out of scope for this build** (as called out in the PRD's own "Out of Scope" section): native
mobile apps, direct hospital system integration, and emergency ambulance services. Online
payments, tele-consultation, medication reminders, and an SOS feature are listed in the PRD as
*future enhancements* and are likewise not built here.

## API overview

All endpoints are prefixed with `/api`. Protected endpoints require `Authorization: Bearer <token>`.

- `POST /auth/register`, `POST /auth/login`, `GET /auth/me`
- `GET /services`, `GET /services/:id`, `POST/PUT/DELETE /services/:id` (admin)
- `GET /caregivers`, `GET /caregivers/me`, `PUT /caregivers/me`, `PATCH /caregivers/:id/verify` (admin), `GET /caregivers/me/history`
- `GET /caregivers/recommend?patientId=...&category=...` — family only; ranks verified caregivers for a specific patient using the ML recommendation engine
- `POST /patients`, `GET /patients/mine`, `GET/PUT /patients/:id`
- `POST /bookings`, `GET /bookings/mine`, `GET /bookings/:id`, `PATCH /bookings/:id/accept|reject|status|rate`
- `POST/GET /bookings/:id/notes`
- `GET /admin/users`, `GET /admin/caregivers`, `GET /admin/caregivers/pending`, `GET /admin/analytics`
- `GET /admin/sentiment-flags` — negative-sentiment ratings and care notes for review
- `POST /triage` — public; body `{ "description": "..." }`, proxies to the ML service and returns
  a suggested category plus matching services (returns a 503 with a friendly message if the ML
  service isn't running)

## Deploying

**1. Database (Supabase, free tier):**
- Create a project at [supabase.com](https://supabase.com).
- Go to Project Settings → Database → Connection string → copy the URI (use the "Session
  pooler" connection string if your host doesn't support long-lived direct connections).
- Set that as `DATABASE_URL` in the backend's environment. The schema and any missing
  columns are created automatically on first run (`db.init()` in `server.js`) — no manual
  migration step needed.

**2. ML service**: any Python host (Render, Railway, Fly.io). Commit the trained
  `ml-service/model/*.joblib` files, or add a build step that runs `python train.py &&
  python train_sentiment.py` before starting. Start command: `uvicorn app:app --host 0.0.0.0
  --port $PORT`.

**3. Backend**: any Node host (Render, Railway, a VPS, etc.).
  - `DATABASE_URL` — your Supabase connection string from step 1
  - `JWT_SECRET` — generate a real random secret, don't reuse the dev default
  - `ML_SERVICE_URL` — your deployed ML service's URL from step 2
  - `FRONTEND_URL` — your deployed frontend's URL (locks down CORS to just that origin)
  - Start command: `npm run start` (not `dev`)
  - Run `npm run seed` once via the host's shell/console if starting from an empty database

**4. Frontend**: `npm run build` produces `frontend/dist` — deploy as a static site (Vercel,
  Netlify, S3+CloudFront, etc.) and set `VITE_API_URL` to your deployed backend's URL.

**Before going live:** change the seeded demo passwords (`admin123`, `family123`,
`caregiver123`) if this database will be seeded anywhere public — they're printed in this
README and in `seed.js`, so treat them as compromised by default.
