# System architecture

## 1. High-level overview

```
┌─────────────────────┐        HTTPS/JSON        ┌──────────────────────────┐
│   Frontend (static)  │ ───────────────────────▶ │   Backend (Express API)  │
│  HTML + CSS + vanilla │ ◀─────────────────────── │   Node.js, port 5000     │
│  JS, served as static │        JWT bearer         └────────────┬─────────────┘
│  files (npx serve)    │                                        │
└─────────────────────┘                                         │ pg driver
        │ Leaflet.js                                             ▼
        ▼                                              ┌──────────────────┐
┌─────────────────┐                                     │   PostgreSQL      │
│ OpenStreetMap    │                                     │  (single instance)│
│ tile server       │                                     └──────────────────┘
└─────────────────┘
```

There is no build step anywhere in this project. The frontend is plain files served
as-is; the backend is plain Node.js run directly with `node`/`nodemon`. This is a
deliberate choice for a class project: fewer moving parts to explain, no bundler
configuration to defend, and every request/response is visible in browser dev tools
without source maps.

## 2. Backend layering

The backend follows a conventional layered structure, each layer only calling the one
below it:

```
Routes            → maps an HTTP verb + path to a controller function, and attaches
                     requireAuth / requireRole middleware
Controllers       → reads req.body/req.params, calls one or more models/services,
                     shapes the HTTP response
Services          → cross-cutting logic that isn't tied to one table
                     (notificationService, smsService)
Models            → one file per table (or closely related group of tables), every
                     function is a single parameterized SQL query via the shared pg Pool
```

Nothing above the model layer writes raw SQL, and nothing below the controller layer
touches `req`/`res` — this keeps each layer independently testable and easy to explain
line-by-line during a defense.

## 3. The SOS → alert → response pipeline

This is the pipeline the whole project exists to demonstrate:

```
1. Passenger/operator presses SOS (frontend)
2. Browser Geolocation API captures {latitude, longitude, accuracy}
   (or a simulated Volta Lake location is used, if permission is denied)
3. POST /api/emergencies  { emergency_type, latitude, longitude, location_accuracy, ... }
4. emergencyController.createEmergency:
     a. priorityForType() recomputes priority server-side (never trusts the client)
     b. emergencyModel.createEmergency() INSERTs the row, status = NEW
     c. locationHistoryModel.record() logs the GPS point
     d. notificationService.notifyNewEmergency(emergency):
          - writes an in-app notification row (picked up by admin/responder polling)
          - emergencyContactModel.listAll({activeOnly:true}) — only ACTIVE contacts
          - buildSmsMessage() formats the EMERGENCY ALERT text
          - smsService.sendEmergencySMS() sends to each contact and logs every attempt
            to sms_logs, regardless of success/failure
     e. auditLogModel.record() — EMERGENCY_CREATED
5. Response returns the full emergency + how many contacts were notified
6. Frontend shows "SOS sent" and starts polling GET /api/emergencies/:id every 4s
7. Admin dashboard (separately polling GET /api/emergencies every 8s) shows the new
   marker on the Leaflet map and row in the incident list
8. Admin/responder clicks through: assign responder → acknowledge → in progress →
   arrived → resolved. Each PATCH re-runs the same notify → log → audit pattern.
```

Every step in that list corresponds to a specific file — see `docs/api-documentation.md`
for the endpoint list and `docs/database-design.md` for exactly which columns get written
at each stage.

## 4. SMS provider abstraction

```
emergencyController  →  notificationService  →  smsService  →  {demoProvider | twilioProvider}
```

`smsService.js` is the single seam: it reads `SMS_PROVIDER` from the environment once and
picks a provider module, both of which expose the same `send({ to, message })` contract.
Nothing above `smsService.js` knows or cares which provider is active. Adding a new
provider (e.g. Africa's Talking or Hubtel, both popular in Ghana) means:

1. Create `backend/src/services/sms/newProvider.js` exporting `send({ to, message })`
2. Add one line to the `PROVIDERS` map in `smsService.js`
3. Set `SMS_PROVIDER=newProvider` in `.env`

No controller, route, or model changes required.

## 5. Authentication & authorization

- Passwords are hashed with bcrypt (`bcryptjs`, cost factor 10) — never stored in plain
  text, never logged.
- On login, a JWT is issued containing `{ id, role, full_name }`, signed with `JWT_SECRET`,
  expiring after `JWT_EXPIRES_IN` (default 7 days).
- `middleware/auth.js`'s `requireAuth` verifies the token on every protected route and
  attaches the decoded payload to `req.user`.
- `requireRole(...roles)` is layered on top for endpoints that only certain roles may call
  (e.g. only `ADMIN` can manage emergency contacts; only `ADMIN`/`RESPONDER` can list all
  emergencies; a passenger can only ever see their own).
- The frontend stores the token in `localStorage` and attaches it as
  `Authorization: Bearer <token>` on every API call (see `frontend/assets/js/api.js`).

## 6. Offline / low-connectivity design

The **database schema and backend** are designed with intermittent connectivity in mind
(see `location_history` for GPS trails, and the fact that SMS failure never blocks
emergency creation). However, **true client-side offline queueing (service worker +
background sync) is not implemented** in this prototype — see the README's "what would be
required for real deployment" section. What *is* implemented: every network call in the
frontend (`api.js`) catches connection failures and shows a specific, friendly message
("Cannot reach the backend server...") rather than a silent failure or a raw stack trace.

## 7. Error handling architecture

`middleware/errorHandler.js` is the last middleware registered in `server.js`. Every
controller uses `asyncHandler()` to forward thrown/rejected errors into it automatically,
so no controller needs its own try/catch for the "something went wrong" case. The handler
translates common PostgreSQL error codes (`23505` unique violation, `23503` foreign key
violation, `ECONNREFUSED`) into friendly messages, and only ever includes the raw error
message to the client when `NODE_ENV=development` — production responses never leak stack
traces or internal details.

## 8. Scalability notes (for the "future scalability" section of your defense)

This is a single-instance, single-database prototype by design. To scale it up:

- The backend is already stateless (no in-memory session state — everything is in
  PostgreSQL or the JWT itself), so it can be horizontally scaled behind a load balancer
  with no code changes.
- The SMS provider abstraction already supports swapping in a queue-backed sender
  (e.g. push jobs onto a queue in `smsService.js` instead of sending inline) without
  touching any controller.
- PostgreSQL can be moved to a managed instance (RDS, Supabase, etc.) by changing only
  `DATABASE_URL`.
- Real-time polling (currently `setInterval` on the frontend) is the first thing to
  replace with WebSockets/Server-Sent Events if this became a production system —
  the notification/audit log tables already capture every event that would need to be
  pushed.
