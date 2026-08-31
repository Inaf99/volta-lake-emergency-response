# Database setup — Volta Lake Emergency Response

This project uses **PostgreSQL**. No ORM is used — the backend talks to
Postgres directly through the `pg` driver, which keeps the SQL visible
and easy to explain during a project defense.

## 1. Create the database

```bash
createdb volta_lake_emergency
```

If `createdb` isn't on your PATH, use `psql` instead:

```bash
psql -U postgres -c "CREATE DATABASE volta_lake_emergency;"
```

## 2. Apply the schema

```bash
psql -d volta_lake_emergency -f schema.sql
```

This creates every table described in `docs/database-design.md`:
`users`, `boats`, `trips`, `emergencies`, `responders`,
`emergency_contacts`, `notifications`, `sms_logs`,
`location_history`, `audit_logs`.

## 3. Seed demo data

Two steps, because user passwords must be bcrypt-hashed by Node, not by SQL:

```bash
psql -d volta_lake_emergency -f seed.sql      # emergency contacts only
cd ../backend && npm install && npm run seed  # users, boats, trips, emergencies
```

After `npm run seed` finishes it prints demo login credentials to the
terminal — use those to sign in from the frontend.

## 4. Point the backend at your database

In `backend/.env` (copied from `backend/.env.example`):

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/volta_lake_emergency
```

Adjust the username/password/host/port to match your local Postgres install.
