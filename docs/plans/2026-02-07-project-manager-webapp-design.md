# Project Manager Webapp Design

## Problem

The Coda iOS app crashes due to document size, making it unusable for managing projects on mobile. We need a lightweight mobile-first webapp that reads/writes to the existing Coda document via the Coda API.

## Architecture

- **Framework:** Next.js (App Router) with TypeScript + Tailwind CSS
- **Hosting:** Vercel free tier
- **Auth:** Passkeys (WebAuthn) via `@simplewebauthn/server` + `@simplewebauthn/browser`
- **Credential storage:** Vercel KV (free tier)
- **Testing:** Playwright E2E tests with browser-level route interception
- **Gantt chart:** frappe-gantt library

### Data flow

```
Phone browser -> Next.js frontend -> Next.js API routes -> Coda API
                                          |
                                    (CODA_API_TOKEN in env)
```

## Coda Document Structure

**Doc ID:** `N2tIjWdJ-z`

### Tables

| Table | ID | Type | Purpose |
|---|---|---|---|
| All projects | `grid-TqE3BT2kf9` | base table | Main project data |
| All status updates | `grid-8AlDOLhgoZ` | base table | Daily status entries |
| Stages | `grid-2to8piPKuN` | base table | Project lifecycle stages |
| Statuses | `grid-ccpfiS5FyX` | base table | Traffic light health indicators |
| Tags | `grid-95g-u3q1hk` | base table | Project tags |

### All projects columns

| Column | ID | Type | Notes |
|---|---|---|---|
| Initiative name | `c-MXIeKLNfrv` | text | Display name |
| Start date | `c-lJkN-Zw_Eo` | date | |
| End date | `c-N2NlgsAJTg` | date | |
| Stage | `c-mz3yxJITqF` | lookup -> Stages | Lifecycle stage |
| Description | `c-5fIGynImKW` | canvas | Rich text |
| Benefit | `c-vg5eSInGZH` | canvas | Rich text |
| Tags | `c-Sdm6yCDzOz` | lookup -> Tags | Multi-select |
| All statuses | `c-Z_k_Zxpckj` | lookup -> Status updates | Calculated, reverse join |
| Most recent status update | `c-bkokiGk7GO` | lookup -> Status updates | Calculated |
| Most recent status update (traffic light) | `c-c07j7TRSmW` | lookup -> Statuses | Calculated |

### All status updates columns

| Column | ID | Type | Notes |
|---|---|---|---|
| Update | `c-qv73ymCy5Q` | canvas | Display column, the update text |
| Status | `c-hkG_smoQeT` | lookup -> Statuses | Traffic light color |
| Initiative | `c-hV9p0alsy9` | lookup -> All projects | Which project this belongs to |
| Date | `c-hCMncW8frI` | date | Defaults to today |

### Lookup values

**Stages:** Incomplete, Idea, Planned, Active, Complete, Blocked

**Statuses (traffic light):** On track, At risk, Off track

**Tags:** Physical, Fun, Life360, Personal

## Views

### Navigation

Bottom tab bar with 4 tabs: Home (active project), Timeline, Projects (list), + New

### Home / Active Project View

- Hero card: project name, stage badge, date range, description snippet
- Quick Status Entry form:
  - Date picker defaulting to **yesterday**
  - 3 traffic-light buttons (green/yellow/red) to select status
  - Text area for update note
  - Submit button
- Recent status updates listed below (last 5-7 days)
- Error states: warning banner if 0 or 2+ active projects, with quick-fix buttons ("Set as only active", "Create new project")

### Timeline View

- Horizontal Gantt chart using frappe-gantt
- Projects as colored bars (color = stage)
- Tap a bar to navigate to project detail
- Auto-scrolls to center on today

### Project Detail / Edit View

- Editable fields: Name, Description, Benefit, Start date, End date, Stage (dropdown), Tags (multi-select)
- All status updates for this project listed below
- Option to add a new status update
- Save button

### New Project Form

- Fields: Name, Description, Benefit, Start date, End date, Stage (defaults to "Idea"), Tags
- Create button

## API Routes

All routes require valid passkey session (except `/api/auth/*`).

| Route | Method | Purpose |
|---|---|---|
| `/api/projects` | GET | List all projects |
| `/api/projects` | POST | Create a new project |
| `/api/projects/[id]` | GET | Get single project with status updates |
| `/api/projects/[id]` | PATCH | Update project fields |
| `/api/projects/active` | GET | Get active project(s) |
| `/api/status-updates` | POST | Create a status update |
| `/api/stages` | GET | List stages (cached) |
| `/api/tags` | GET | List tags (cached) |
| `/api/statuses` | GET | List statuses (cached) |
| `/api/auth/register-options` | POST | Start passkey registration |
| `/api/auth/register-verify` | POST | Complete passkey registration |
| `/api/auth/login-options` | POST | Start passkey authentication |
| `/api/auth/login-verify` | POST | Complete passkey authentication |

### Response format (example project)

```json
{
  "id": "i-TU56x9rL_3",
  "name": "2025 Performance Reviews",
  "description": "Get em done!",
  "benefit": "Off my plate and ease my mind",
  "startDate": "2026-02-06",
  "endDate": "2026-02-06",
  "stage": "Complete",
  "tags": ["Life360"],
  "recentStatus": "On track",
  "statusUpdates": [
    {
      "id": "i-abc123",
      "date": "2026-02-06",
      "status": "On track",
      "update": "Finished all reviews"
    }
  ]
}
```

## Auth — Passkey Flow

### First-time registration

1. Visit `/setup`
2. Enter one-time setup secret (`SETUP_SECRET` env var)
3. Register passkey (Face ID / Touch ID prompt)
4. Credential stored in Vercel KV
5. `/setup` disabled after first registration

### Subsequent logins

1. Visit app -> redirected to `/login`
2. Tap "Sign in" -> biometric prompt
3. Server verifies passkey -> sets HttpOnly session cookie (30-day expiry)
4. Redirected to Home view

### Libraries

- `@simplewebauthn/server` — server-side WebAuthn verification
- `@simplewebauthn/browser` — browser-side WebAuthn API

### Credential storage

Vercel KV (free tier: 30MB, 30k requests/month). Stores credential ID and public key.

## Testing Strategy

Playwright E2E tests with browser-level route interception.

### Fixtures

```
fixtures/
  projects.json
  status-updates.json
  stages.json
  tags.json
  statuses.json
```

### Test suites

| Suite | Coverage |
|---|---|
| Home view | Active project display, error states (0/2+ active), quick fix buttons |
| Quick status entry | Date defaults to yesterday, color selection, note entry, submit |
| Timeline | Gantt renders, bars positioned correctly, tap navigates to detail |
| Project detail | Field display, edit + save, status update list |
| New project | Form validation, creation, appears in list |
| Auth | Redirect to login when unauthenticated, session cookie |

### Auth in tests

Bypass passkey auth by injecting a valid session cookie via `context.addCookies()`.

### Coda API mocking

Playwright `page.route()` intercepts browser -> Next.js API route calls, returning fixture data. Error state tests override specific routes.
