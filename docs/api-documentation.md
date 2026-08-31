# API documentation

Base URL: `http://localhost:5000/api`

All endpoints except `POST /auth/register`, `POST /auth/login`, and `GET /health` require
an `Authorization: Bearer <token>` header. Endpoints marked **[ADMIN]** or
**[ADMIN/RESPONDER]** additionally require the caller's role to match.

Every error response has the shape `{ "error": "human readable message" }` and an
appropriate HTTP status code (400 validation, 401 auth, 403 forbidden, 404 not found,
409 conflict, 500 server error).

## Health

| Method | Path | Description |
|---|---|---|
| GET | `/health` | `{ status: 'ok', smsProvider, nodeEnv }` — no auth required |

## Auth

| Method | Path | Body | Description |
|---|---|---|---|
| POST | `/auth/register` | `{ full_name, phone, password, email?, role?, emergency_contact_name?, emergency_contact_phone? }` | Creates a user (defaults to `PASSENGER` if `role` omitted/invalid). Returns `{ user, token }`. If `role = RESPONDER`, a matching `responders` row is auto-created. |
| POST | `/auth/login` | `{ phone, password }` | Returns `{ user, token }` |
| GET | `/auth/me` | — | Returns the current user's profile |

## Emergencies (the core resource)

| Method | Path | Auth | Body / Query | Description |
|---|---|---|---|---|
| POST | `/emergencies` | any authenticated user | `{ emergency_type, latitude, longitude, location_accuracy?, boat_id?, trip_id?, description?, is_demo? }` | **The "press SOS" endpoint.** Creates the emergency, recomputes priority server-side, logs a location-history point, runs the full notify → SMS → audit-log pipeline. Returns `{ emergency, notified_contacts, sms_logs }`. |
| GET | `/emergencies` | **[ADMIN/RESPONDER]** | `?status=&priority=` | All emergencies, joined with reporter/boat/responder info, sorted critical-first then newest-first |
| GET | `/emergencies/mine` | any authenticated user | — | The caller's own emergency history |
| GET | `/emergencies/:id` | any authenticated user | — | Single emergency with full joins |
| PATCH | `/emergencies/:id/status` | **[ADMIN/RESPONDER]** | `{ status }` | Advances status (`NEW → ACKNOWLEDGED → RESPONDER_ASSIGNED → RESPONSE_IN_PROGRESS → ARRIVED → RESOLVED`, or `CANCELLED`). Stamps the matching timestamp column and sends a status-change notification. |
| PATCH | `/emergencies/:id/assign` | **[ADMIN/RESPONDER]** | `{ responder_id? }` | Assigns a responder. If `responder_id` is omitted, auto-assigns the nearest `AVAILABLE` responder. Sets that responder to `BUSY`. |
| GET | `/emergencies/stats/summary` | **[ADMIN/RESPONDER]** | — | Dashboard counters: active, critical, new, acknowledged, resolved, cancelled |

## Boats

| Method | Path | Auth | Body | Description |
|---|---|---|---|---|
| POST | `/boats` | **[BOAT_OPERATOR/ADMIN]** | `{ boat_name, registration_number, boat_type?, passenger_capacity? }` | Registers a boat under the caller (or, for admin, still tagged to the caller — admins typically edit via the admin UI) |
| GET | `/boats` | any authenticated user | — | Admin sees all boats; everyone else sees only their own |
| PUT | `/boats/:id` | **[BOAT_OPERATOR/ADMIN]**, owner or admin only | `{ boat_name?, registration_number?, boat_type?, passenger_capacity?, status? }` | Partial update |
| DELETE | `/boats/:id` | **[BOAT_OPERATOR/ADMIN]**, owner or admin only | — | Removes the boat |

## Trips

| Method | Path | Auth | Body | Description |
|---|---|---|---|---|
| POST | `/trips` | **[BOAT_OPERATOR/ADMIN]** | `{ boat_id, departure_location?, destination?, current_latitude?, current_longitude? }` | Starts a trip, status `ACTIVE` |
| GET | `/trips` | **[ADMIN/RESPONDER]** | — | All trips, with boat/operator names joined in |
| GET | `/trips/active/mine` | **[BOAT_OPERATOR/ADMIN]** | — | The caller's current active trip, if any |
| PATCH | `/trips/:id/end` | **[BOAT_OPERATOR/ADMIN]** | — | Sets status `COMPLETED`, stamps `end_time` |
| PATCH | `/trips/:id/location` | any authenticated user | `{ latitude, longitude, accuracy? }` | Updates the trip's current position and logs a location-history point |

## Emergency contacts (admin-managed, no hard-coded numbers)

| Method | Path | Auth | Body | Description |
|---|---|---|---|---|
| GET | `/emergency-contacts` | any authenticated user | — | Admins see all contacts; everyone else sees active-only |
| POST | `/emergency-contacts` | **[ADMIN]** | `{ name, phone, contact_type, organization?, description?, priority?, is_active? }` | Creates a contact |
| PUT | `/emergency-contacts/:id` | **[ADMIN]** | any subset of the above fields | Partial update |
| PATCH | `/emergency-contacts/:id/active` | **[ADMIN]** | `{ is_active }` | Enable/disable — inactive contacts never receive SMS |
| DELETE | `/emergency-contacts/:id` | **[ADMIN]** | — | Removes the contact |

## Responders

| Method | Path | Auth | Body | Description |
|---|---|---|---|---|
| GET | `/responders` | **[ADMIN/RESPONDER]** | — | All responders with name/phone/position/availability |
| GET | `/responders/me` | **[RESPONDER]** | — | The caller's own responder profile |
| PATCH | `/responders/:id` | **[ADMIN/RESPONDER]** | `{ availability_status?, current_latitude?, current_longitude? }` | Updates status/position |

## SMS logs

| Method | Path | Auth | Query | Description |
|---|---|---|---|---|
| GET | `/sms-logs` | **[ADMIN]** | `?status=` | Every SMS attempt, newest-first, joined with the related emergency's type |

## Notifications

| Method | Path | Auth | Body | Description |
|---|---|---|---|---|
| POST | `/notifications/emergency` | **[ADMIN/RESPONDER]** | `{ emergency_id }` | Manually re-triggers the full notify/SMS pipeline for an existing emergency (useful for a "resend SMS" demo moment) |

## Users

| Method | Path | Auth | Query/Body | Description |
|---|---|---|---|---|
| GET | `/users` | **[ADMIN]** | `?role=PASSENGER` (required) | Lists users by role |
| PATCH | `/users/me` | any authenticated user | `{ full_name?, email?, emergency_contact_name?, emergency_contact_phone? }` | Updates the caller's own profile |

## Example: reporting an emergency (curl)

```bash
curl -X POST http://localhost:5000/api/emergencies \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "emergency_type": "BOAT_CAPSIZING",
    "latitude": 7.2130,
    "longitude": -0.1745,
    "location_accuracy": 6,
    "boat_id": "<boat-uuid>",
    "description": "Boat taking on water near Akosombo landing."
  }'
```

Response:

```json
{
  "emergency": { "id": "...", "status": "NEW", "priority": "CRITICAL", "...": "..." },
  "notified_contacts": 4,
  "sms_logs": [ { "id": "...", "status": "SIMULATED", "...": "..." } ]
}
```
