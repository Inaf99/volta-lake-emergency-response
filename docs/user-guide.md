# User guide

Beginner-friendly walkthrough of each role, written for a class demo or defense.

## Signing in

Open `http://localhost:5173` (after starting both servers — see the root README). You'll
land on a sign-in screen with two tabs: **Sign in** and **Create account**. If you've run
`npm run seed` in the backend, six demo accounts already exist (all password
`password123`):

| Role | Phone |
|---|---|
| Admin | `+233240000001` |
| Passenger | `+233240000002` |
| Boat operator | `+233240000003` / `+233240000004` |
| Responder | `+233240000005` / `+233240000006` |

Otherwise, use **Create account** and pick a role — no email verification or approval
step exists in this prototype, so you're logged in immediately.

---

## Passenger

**Home screen:** shows the SOS button front and center, plus your emergency history below.

1. **Report an emergency** — press the red **SOS** button.
2. Confirm you want to report a real emergency.
3. Pick an emergency type (Capsizing, Person overboard, Medical, Fire, Engine failure,
   Sinking, Collision, Bad weather, Other) — or press **Skip — send now with GPS only** if
   every second counts.
4. The app asks your browser for your location. If you allow it, your real GPS
   coordinates, accuracy, and a timestamp are captured automatically. If you deny it (or
   you're on a desktop with no GPS), you'll be offered a simulated Volta Lake location
   instead — the workflow still works end-to-end either way.
5. Review the summary and press **Send SOS now**.
6. You'll see **"SOS sent"** immediately, followed by a live status tracker
   (Reported → Acknowledged → Responder assigned → In progress → Resolved) that updates
   automatically as responders act on your report — no need to refresh the page.
7. **My emergency history**, below the SOS button, lists every emergency you've ever
   reported and its final/current status.

## Boat operator

Everything a passenger can do, plus:

1. **My boats** — press **+ Register boat**, give it a name, registration number, and
   passenger capacity.
2. **Current trip** — press **Start trip**, pick a registered boat, and optionally note a
   departure point and destination. This is what lets the admin/responder dashboard show
   your boat's live/last-known position.
3. **End trip** whenever the journey is over.
4. The same **SOS** button is available, and automatically attaches your active trip's
   boat to the emergency report if one exists.

## Responder

**Active incidents** lists every emergency that isn't yet resolved or cancelled, ranked
critical-first.

1. Click an incident to open its detail panel: type, priority, reporter, boat, GPS
   coordinates, and who (if anyone) is currently assigned.
2. If unassigned, press **Accept assignment** to take it on.
3. Press **Acknowledge** first, then step through **Mark as RESPONDER ASSIGNED → RESPONSE
   IN PROGRESS → ARRIVED → RESOLVED** as you actually respond.
4. **Navigate to emergency** opens the coordinates in OpenStreetMap in a new tab.

## Admin — command center

The admin section has its own left-hand navigation:

- **Dashboard** — live Leaflet map of Volta Lake with color-coded markers (critical =
  red, high = amber, normal = green), the incident list, stat cards (active, critical,
  new, acknowledged, resolved, cancelled), and a **"Simulate incoming SOS"** button for
  demonstrating the whole loop without a second device.
- **Boats** — every registered boat; edit capacity/status or delete a boat.
- **Trips** — every trip, active or completed, with current/last-known position.
- **Responders** — every responder, their position, and availability; you can manually
  flip a responder to Available/Offline.
- **Emergency Contacts** — full CRUD (add, edit, enable/disable, delete) over who
  receives SMS alerts. **Nothing here is hard-coded** — this is the list the SMS pipeline
  actually reads from at send time.
- **SMS Logs** — every SMS attempt ever made (simulated or real), with status, provider,
  and the full message text (click a message preview to see it in full).
- **Reports** — total counts, a breakdown by emergency type and by status, and average
  time-to-acknowledge across every recorded emergency.

### Demonstrating the full loop in one browser (recommended for a live defense)

Because everything is one static frontend talking to one backend, the simplest way to
demo the complete SOS → SMS → responder → resolution loop for a class is:

1. Open two browser windows side by side — one normal, one incognito/private (so you can
   be logged in as two different roles at once).
2. Normal window: sign in as the seeded **passenger**. Incognito window: sign in as
   **admin**.
3. Press SOS in the passenger window, walk through the flow, send it.
4. Switch to the admin window — within a few seconds (it polls every 8s, or refresh
   manually) the new incident appears on the map and in the list.
5. Click it, assign a responder, and walk it through Acknowledged → In Progress →
   Resolved.
6. Switch back to the passenger window — its status tracker has updated automatically.
7. Open **Admin → SMS Logs** to show the simulated SMS that fired the moment the
   emergency was created.

This single-loop demo touches every major requirement in the project brief: GPS capture,
database persistence, map visualization, SMS notification, role-based dashboards, and the
full emergency status lifecycle.
