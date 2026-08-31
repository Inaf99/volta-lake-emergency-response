# Volta Lake Emergency Response (LAERS)

**Location-Aware Emergency Alert and Response System for Passengers and Boat Operators on Volta Lake**

A university class project prototype. It is a realistic, fully working demonstration of a
marine emergency-alert system — not a production emergency service. Every "what's
implemented vs. simulated" distinction is spelled out in section 16 below, because you'll
need that for your defense.

---

## 1. Project overview

Passengers and boat operators on Volta Lake often travel through areas with weak phone
signal and no dedicated emergency line. LAERS lets a passenger or operator press one SOS
button, automatically captures their GPS location, creates an emergency record, and fans
that alert out three ways at once: to the admin/responder dashboard, to an in-app
notification, and by SMS to whichever emergency contacts an administrator has configured
as active — all without any phone number ever being hard-coded into the source code.

The core loop this project demonstrates:

```
SOS pressed → GPS captured → emergency saved → appears on admin map
  → active emergency contacts identified → SMS sent (or simulated)
  → SMS logged → responder acknowledges → responder assigned
  → response in progress → arrived → resolved
```

## 2. Features

**Priority 1 — critical safety workflow (fully implemented)**
- Registration/login with JWT, 4 roles: PASSENGER, BOAT_OPERATOR, RESPONDER, ADMIN
- One-press SOS button with a confirm step, emergency-type selection, and GPS capture
- Browser Geolocation API for real GPS, with a simulated-location fallback for desktop demos
- Emergency created, saved, and immediately visible on the admin's live Leaflet map
- SMS fan-out to every *active* emergency contact, with demo/Twilio provider abstraction
- Full status lifecycle: NEW → ACKNOWLEDGED → RESPONDER_ASSIGNED → RESPONSE_IN_PROGRESS →
  ARRIVED → RESOLVED (or CANCELLED)
- Admin command dashboard: stats, live map, incident list, incident detail/actions
- Admin-managed emergency contacts (full CRUD + enable/disable) — **no hard-coded numbers**

**Priority 2 — operational features (implemented)**
- Boat registration, trip start/end, live/last-known trip location
- Emergency type → priority mapping (CRITICAL / HIGH / NORMAL), recomputed server-side
- Nearest-available-responder auto-assignment (simple planar distance)
- SMS logs page (recipient, message, provider, status, error, timestamp)
- Location history table (every GPS point captured is retained)
- Audit log for emergency status changes and contact management
- Offline-friendly error handling: GPS failure, network failure, DB unavailable all show a
  friendly message instead of crashing

**Priority 3 — advanced / partially implemented**
- Basic reports page (counts by type/status, average time-to-acknowledge)
- Nearest-responder distance calculation (planar, not haversine — see §16)
- Geofencing, weather integration, and authority hand-off are **not** implemented — see §16

## 3. Technology stack

| Layer | Choice |
|---|---|
| Frontend | Plain HTML + CSS + vanilla JavaScript (no build step, no framework) |
| Maps | Leaflet.js + OpenStreetMap tiles (free, no API key) |
| Backend | Node.js + Express |
| Database | PostgreSQL (raw SQL via the `pg` driver — no ORM) |
| Auth | JWT (jsonwebtoken) + bcrypt password hashing |
| SMS | Provider-abstracted service; `demo` provider (default) or `twilio` |

The frontend is intentionally plain HTML/CSS/JS rather than React/Vite: it runs by opening
a static file server, nothing to compile, and every line of markup and script is visible
directly in the browser's dev tools — good for a project defense.

## 4. Folder structure

```
volta-lake-emergency-response/
├── README.md                  ← you are here
├── .env.example                ← summary only; real config lives in backend/.env
├── .gitignore
├── package.json                 ← convenience scripts for both halves
│
├── frontend/                    ← plain HTML/CSS/JS, no build step
│   ├── index.html                ← login / register
│   ├── assets/
│   │   ├── css/style.css          ← one shared stylesheet
│   │   └── js/{config,api,auth,toast}.js
│   └── pages/
│       ├── passenger.html
│       ├── operator.html
│       ├── responder.html
│       └── admin/
│           ├── dashboard.html
│           ├── boats.html
│           ├── trips.html
│           ├── responders.html
│           ├── emergency-contacts.html
│           ├── sms-logs.html
│           └── reports.html
│
├── backend/
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── server.js
│       ├── config/{env,db}.js
│       ├── controllers/          ← one per resource
│       ├── models/                ← raw SQL query functions, one per table group
│       ├── routes/                ← Express routers, one per resource
│       ├── middleware/{auth,errorHandler}.js
│       ├── services/
│       │   ├── notificationService.js   ← builds messages, fans out to SMS
│       │   ├── smsService.js            ← picks the active provider, logs every attempt
│       │   └── sms/{demoProvider,twilioProvider}.js
│       └── utils/{jwt,asyncHandler,emergencyPriority,buildMapLink,seed}.js
│
├── database/
│   ├── schema.sql                ← full PostgreSQL schema
│   ├── seed.sql                   ← demo emergency contacts (no passwords to hash)
│   └── README.md                  ← step-by-step DB setup
│
└── docs/
    ├── system-architecture.md
    ├── database-design.md
    ├── api-documentation.md
    └── user-guide.md
```

## 5. Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+ running locally (or a connection string to a hosted instance)
- A modern browser (for the Geolocation API and Leaflet map)
- (Optional) A free Twilio trial account, only if you want real SMS instead of demo mode

## 6. Installation

```bash
git clone <this project's folder>   # or just open the folder in VS Code
cd volta-lake-emergency-response
```

### 6.1 Backend

```bash
cd backend
npm install
cp .env.example .env
```

Open `backend/.env` and set at minimum `DATABASE_URL` (see §8). Everything else has a
working default — `SMS_PROVIDER=demo` is already set, so you can run the whole project
before touching Twilio.

### 6.2 Frontend

The frontend has **no dependencies to install** — it's static files. You just need
something to serve them (opening `index.html` directly with `file://` will not work
because of CORS and root-relative links). The simplest option:

```bash
cd ../frontend
npx serve -l 5173 .
```

Or use VS Code's **Live Server** extension on `frontend/index.html`, as long as it serves
on port 5173 (or update `FRONTEND_ORIGIN` in `backend/.env` to match whatever port you use).

## 7. Database setup

Full details in `database/README.md`. Short version:

```bash
createdb volta_lake_emergency
psql -d volta_lake_emergency -f database/schema.sql
psql -d volta_lake_emergency -f database/seed.sql   # emergency contacts
cd backend && npm run seed                            # demo users, boats, trip, emergencies
```

`npm run seed` prints demo login credentials to the terminal when it finishes.

## 8. Environment variables

All real configuration lives in `backend/.env` (copy it from `backend/.env.example`).
**Never commit your real `.env` file** — it's already listed in `.gitignore`.

| Variable | Purpose | Default |
|---|---|---|
| `PORT` | Backend port | `5000` |
| `NODE_ENV` | `development` or `production` | `development` |
| `FRONTEND_ORIGIN` | Allowed CORS origin | `http://localhost:5173` |
| `DATABASE_URL` | PostgreSQL connection string | *(you must set this)* |
| `JWT_SECRET` | Signs auth tokens — change this | placeholder, insecure |
| `JWT_EXPIRES_IN` | Token lifetime | `7d` |
| `SMS_PROVIDER` | `demo` or `twilio` | `demo` |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_PHONE_NUMBER` | Only needed if `SMS_PROVIDER=twilio` | empty |
| `MAP_PROVIDER` | URL template used to build "view on map" links inside SMS/notifications | OpenStreetMap link |

## 9. Running the backend

```bash
cd backend
npm run dev      # nodemon, auto-restarts on file changes
# or: npm start  # plain node, for a "final" demo run
```

You should see `[db] Connected to PostgreSQL...` and `Server running on port 5000` in the
terminal. Visit `http://localhost:5000/api/health` to confirm.

## 10. Running the frontend

```bash
cd frontend
npx serve -l 5173 .
```

Then open `http://localhost:5173` in your browser. Sign in with a seeded demo account (see
`database/README.md` or the terminal output from `npm run seed`), or register a new one
from the "Create account" tab.

**Two terminals, side by side, is the expected way to run this project** — exactly as
requested in the brief:

```
Terminal 1:            Terminal 2:
cd backend               cd frontend
npm install               npx serve -l 5173 .
npm run dev
```

## 11. SMS configuration

The SMS pipeline follows one path regardless of provider, so swapping providers never
touches the emergency workflow code:

```
Emergency Controller → Notification Service → SMS Service → SMS Provider
```

`backend/src/services/smsService.js` is the *only* file that knows which provider is
active (read from `SMS_PROVIDER`). To send real SMS:

1. Create a free Twilio trial account and buy/verify a phone number.
2. In `backend/.env`, set:
   ```
   SMS_PROVIDER=twilio
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
   ```
3. Restart the backend. Every SMS log's `provider` column will now say `twilio` and
   `status` will be `SENT` (or `FAILED` with the Twilio error message attached — the
   emergency workflow itself never crashes because of an SMS failure).

## 12. Demo SMS mode

This is the default (`SMS_PROVIDER=demo`) and is what makes the project demonstrable
without a paid account. When an emergency is created, `demoProvider.js` prints a block
like this to the **backend terminal**:

```
========== SMS SIMULATION ==========
Recipient: +233200000001
Message:
EMERGENCY ALERT - VOLTA LAKE

Type: Boat Capsizing
Reporter: Ama Boateng
Boat: VOLTA-023
Location: 7.2130, -0.1745
Time: 14:32 UTC

Map: https://www.openstreetmap.org/?mlat=7.2130&mlon=-0.1745#map=16/7.2130/-0.1745

Please respond immediately.
Status: SIMULATED SUCCESS
=====================================
```

...and a matching row is written to `sms_logs` with `status = SIMULATED`, visible on
**Admin → SMS Logs** in the frontend. This is your proof-of-notification for a class demo.

## 13. Creating an admin user

Two options:

- **Fastest:** run `npm run seed` in `backend/` — it creates an admin at
  `+233240000001` / `password123` along with a passenger, two operators, and two responders.
- **Manual:** register from the frontend's "Create account" tab and choose role
  **Admin**. (In a real deployment you would lock this down — see §16 — but for a class
  project, self-service admin signup keeps the demo simple.)

## 14. Testing the SOS workflow

1. Sign in as the seeded passenger (`+233240000002` / `password123`).
2. Press the SOS button → **Yes, report emergency** → pick a type (or **Skip**) →
   allow location, or use **Use simulated location** if your browser denies GPS.
3. Press **Send SOS now**. You'll see a confirmation and a live status tracker.
4. Open a second browser tab (or incognito window), sign in as admin
   (`+233240000001` / `password123`) → **Responder Dashboard** → the new incident appears
   on the map and in the list within a few seconds.
5. Click the incident → **Assign nearest responder** → **Mark as ACKNOWLEDGED** → continue
   through the status chain. Watch the passenger's status tracker update automatically
   (it polls every 4 seconds).
6. Check **Admin → SMS Logs** to see the simulated SMS that went out the moment the
   emergency was created.

There is also a **"Simulate incoming SOS"** button on the admin dashboard, and one on the
passenger/operator pages fall back to a simulated GPS location — both exist specifically so
the whole loop can be demonstrated on a single laptop with no second device.

## 15. Testing GPS

- On a laptop, most browsers will prompt for location permission — allow it to get a real
  (if coarse, Wi-Fi-based) GPS fix.
- If you deny permission or your browser has no location capability, the app immediately
  offers **"Use simulated location"**, which picks a random point inside the Volta Lake
  basin (`lat 7.19–7.25`, `lng -0.20 to -0.13`) so the rest of the workflow still works.
- Every GPS point captured during an SOS or a trip location update is also written to
  `location_history`, so a trail exists even though no UI currently visualizes it.

## 16. Testing SMS

See §14 step 6. To specifically test the **failure path**, set `SMS_PROVIDER=twilio` in
`backend/.env` but leave the Twilio credentials blank, then restart the backend and report
an emergency — the SMS log will show `status = FAILED` with a clear error message, and the
emergency itself will still be created successfully (SMS failure never blocks the core
workflow).

## 17. What is implemented, what is simulated, what real deployment would need

**Implemented for real:**
- Full auth (JWT + bcrypt), role-based access control on every protected route
- Real browser Geolocation API GPS capture
- Real PostgreSQL persistence for every entity in the brief
- Real Leaflet/OpenStreetMap map with live markers
- Real SMS sending when `SMS_PROVIDER=twilio` and credentials are supplied
- Real audit logging of status changes and contact management

**Simulated for the class demo:**
- `SMS_PROVIDER=demo` (default) — no real SMS is sent; the message is logged to the
  console and the database exactly as if it had been
- The "Simulate incoming SOS" button, which manufactures a random emergency the same way
  a real passenger's SOS press would, for demonstrating the loop without a phone
- Demo user accounts and seed data (fictional names, fictional Ghanaian-format phone
  numbers)

**Would be required for real-world deployment (explicitly out of scope here):**
- Push notifications (FCM) — this prototype uses in-app polling instead
- True offline queueing on the client (service worker + background sync) — the app
  currently requires a live connection to submit an SOS; offline behavior is *designed
  for* in the schema/services but not implemented client-side
- Haversine/PostGIS-based distance calculation instead of simple planar distance
  (fine at Volta Lake's scale for a class project, not for production)
- Geofencing, weather/water-condition integration, and marine-authority system integration
- Production-grade secrets management (the current admin self-registration and default
  JWT secret are acceptable for a demo, not for a deployed system)
- Rate limiting, input sanitization hardening, and a real audit trail retention policy

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Backend logs `DATABASE_URL is not set` | `.env` missing or not copied | `cp backend/.env.example backend/.env` and fill in `DATABASE_URL` |
| Frontend shows "Cannot reach the backend server" | Backend not running, or wrong port | Confirm `npm run dev` is running in `backend/` and `API_BASE_URL` in `frontend/assets/js/config.js` matches |
| Login redirects back to the login page in a loop | Old/invalid token in `localStorage` | Open dev tools → Application → Local Storage → clear `laers_token`/`laers_user` |
| SOS button doesn't ask for location | Browser location permission previously denied | Reset the site's location permission in your browser's address-bar padlock menu, or just use "Use simulated location" |
| Map doesn't render | No internet access (Leaflet loads OpenStreetMap tiles over the network) | Confirm you have internet access; tiles are fetched from `tile.openstreetmap.org` |
| `npm run seed` fails with a connection error | Database not created/reachable | Run `createdb volta_lake_emergency` and re-check `DATABASE_URL` |

## Academic presentation notes

This project is built to let you demonstrate, live: location-aware systems (GPS capture
→ map), emergency management (full status lifecycle), a real relational database with
foreign keys and constraints, a REST API with JWT auth and role-based authorization,
a provider-abstracted notification/SMS pipeline, GIS visualization with Leaflet, and
explicit handling of failure states (GPS denied, SMS provider unavailable, network
failure) — see §17 above for exactly which of those are real versus simulated.
