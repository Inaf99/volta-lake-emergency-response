# Database design

PostgreSQL, no ORM — every query lives in `backend/src/models/*.js` as plain
parameterized SQL. Full DDL is in `database/schema.sql`; this document explains the
*why* behind it.

## Entity-relationship summary

```
users ─┬──< boats (operator_id)
       ├──< trips (operator_id)                boats ──< trips (boat_id)
       ├──< responders (user_id, 1:1)
       ├──< emergencies (reporter_id)
       ├──< location_history (user_id)
       └──< audit_logs (actor_id)

emergencies ──< sms_logs (emergency_id)
emergencies ──< notifications (emergency_id)
emergencies >── responders (assigned_responder_id)
emergencies >── boats (boat_id, nullable)
emergencies >── trips (trip_id, nullable)

emergency_contacts ──< sms_logs (contact_id)   [admin-managed, no FK to users]
```

## Table-by-table

### `users`
Every account regardless of role. `role` is a Postgres ENUM
(`PASSENGER | BOAT_OPERATOR | RESPONDER | ADMIN`) rather than a free-text column, so an
invalid role can never be inserted. `phone` is unique and is the login identifier (not
email, since phone is more universal for this use case). `password_hash` is bcrypt —
never queried or returned to the client (see `userModel.findById`, which explicitly
excludes it from its SELECT).

### `boats`
One row per boat, owned by a `BOAT_OPERATOR` (`operator_id → users.id`). `status` is a
plain VARCHAR (`ACTIVE | MAINTENANCE | DECOMMISSIONED`) rather than an ENUM to keep it
easy to extend from the admin UI without a migration.

### `trips`
A boat's journey. `current_latitude`/`current_longitude` are updated as the trip
progresses (`PATCH /api/trips/:id/location`) — this is the "last-known location" the
brief asks for. `status` ENUM: `ACTIVE | COMPLETED | CANCELLED`.

### `responders`
One row per `RESPONDER`-role user (`user_id`, effectively 1:1 with `users`), plus their
current position and `availability_status` (`AVAILABLE | BUSY | OFFLINE`). Separated from
`users` rather than adding responder-only columns onto `users` directly, so the users
table stays role-agnostic and every role's extra data lives in its own table.

### `emergencies`
The central table. Notable design decisions:
- `priority` and `status` are both ENUMs, so an invalid state is a database-level
  impossibility, not just an application-level convention.
- `boat_id` and `trip_id` are nullable — a passenger without an active trip on file can
  still report an emergency (GPS-only).
- Every status-transition timestamp (`acknowledged_at`, `assigned_at`, `arrived_at`,
  `resolved_at`, `cancelled_at`) is its own column rather than a single `updated_at`,
  specifically so `docs/api-documentation.md`'s stats endpoint and the Reports page can
  compute "average time to acknowledge" etc. directly in SQL.
- `is_demo` flags emergencies created via the "Simulate incoming SOS" button, so a real
  deployment could filter them out of production analytics.

### `emergency_contacts`
Deliberately **has no foreign key to `users`** — these are organizations/numbers an admin
configures (Marine Rescue, Police, Fire Service, ...), not necessarily system users at
all. `is_active` gates SMS delivery: `notificationService.notifyNewEmergency()` only ever
queries `WHERE is_active = TRUE`. `priority` (integer, 1 = highest) controls display order
only in this version; the SMS fan-out currently notifies *all* active contacts
simultaneously rather than escalating by priority tier — see README §17 for what a
production version would add here.

### `notifications`
The in-app notification log. `recipient_id` is nullable — a new-emergency alert is a
broadcast to the admin/responder dashboard (no single recipient), while a status-change
notification targets the original `reporter_id`.

### `sms_logs`
One row per SMS *attempt*, regardless of outcome — this is intentional so the admin can
prove the system tried to notify someone even if it failed. `status` ENUM:
`PENDING | SENT | FAILED | SIMULATED`. `provider` records which provider was active at
send time (useful if you demo with `SMS_PROVIDER=demo` for most of the class then switch
to `twilio` for one live send).

### `location_history`
Append-only GPS trail. Either `user_id` or `boat_id` (or both) is set depending on
whether the point came from an SOS report or a trip location update.

### `audit_logs`
Append-only record of sensitive state changes (`EMERGENCY_CREATED`,
`EMERGENCY_STATUS_CHANGED`, `RESPONDER_ASSIGNED`, `CONTACT_CREATED/UPDATED/DELETED/
ENABLED/DISABLED`). `details` is `JSONB` so each action can carry whatever shape of
metadata makes sense (e.g. `{ from: 'NEW', to: 'ACKNOWLEDGED' }`) without schema changes.

## Constraints & indexes worth mentioning in a defense

- `gen_random_uuid()` (via the `pgcrypto` extension) is used for every primary key
  instead of auto-incrementing integers, so IDs are non-guessable and safe to expose in
  the API/frontend without leaking row counts.
- `ON DELETE CASCADE` is used where a child row is meaningless without its parent (e.g.
  a trip without its boat); it is deliberately **not** used on `emergencies.reporter_id`
  (plain `REFERENCES`, no cascade) so an emergency record survives even if the reporting
  account is later deleted — emergency history should outlive the account that created it.
- Indexes are added on every column used in a `WHERE`, `ORDER BY`, or join in the model
  layer (e.g. `idx_emergencies_status`, `idx_emergencies_priority`,
  `idx_sms_logs_emergency`) — each one maps directly to a query you can point to in
  `emergencyModel.js` / `smsLogModel.js`.
- `set_updated_at()` triggers automatically keep `updated_at` current on `UPDATE`, so no
  application code has to remember to set it manually (a common source of stale-timestamp
  bugs).

## Seeding strategy

`database/seed.sql` only inserts rows with **no password to hash** — the emergency
contacts list. Everything with a password (users, and by extension boats/trips/
emergencies that reference a user) is created by `backend/src/utils/seed.js`, a Node
script that calls `bcrypt.hash()` before inserting. This split exists because plain SQL
cannot safely bcrypt-hash a password; trying to fake it with a hard-coded hash string
would mean every seeded account shares the literal same hash, which is a bad habit to
demonstrate even in a class project.
