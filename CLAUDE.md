# Project Manager Coda

Mobile-first Next.js webapp that reads/writes to a Coda document (MONOFOCUS-HUB) via the Coda API. The Coda iOS app crashes due to document size, so this is a lightweight alternative.

## Tech Stack

- **Framework:** Next.js 16 (App Router, TypeScript, Tailwind CSS v4)
- **Auth:** Passkeys (WebAuthn) via @simplewebauthn/browser + @simplewebauthn/server
- **Session:** JWT (jose, HS256, 30-day expiry, HttpOnly cookies)
- **KV Store:** Vercel KV for credentials (in-memory fallback for local dev)
- **Timeline:** gantt-task-react
- **Testing:** Playwright E2E with browser-level route interception
- **Hosting:** Vercel free tier

## Project Structure

```
src/
  lib/
    coda.ts          # Coda table/column/row IDs (constants)
    coda-client.ts   # Server-side Coda API client with 30s cache
    types.ts         # Shared TypeScript types
    api.ts           # Frontend fetch helpers
    auth.ts          # WebAuthn session management (JWT)
    kv.ts            # Vercel KV wrapper (in-memory fallback)
  app/
    api/             # 11 API route files (projects, status-updates, lookups, auth)
    page.tsx         # Home — active project dashboard
    timeline/        # Gantt chart (gantt-task-react)
    projects/        # Project list + detail/edit views
    new/             # New project form
    login/           # Passkey login
    setup/           # First-time passkey registration
  components/        # BottomNav, GanttChart, ActiveProjectCard, etc.
  middleware.ts      # Route protection (JWT verification)
e2e/                 # Playwright tests with fixtures and API mocking
```

## Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
npx playwright test  # Run E2E tests
```

## Environment Variables

- `CODA_API_TOKEN` — Coda API bearer token (in .env.local)
- `JWT_SECRET` — Secret for signing session JWTs
- `SETUP_SECRET` — One-time passkey registration secret
- `KV_REST_API_URL` / `KV_REST_API_TOKEN` — Vercel KV (optional, falls back to in-memory)

---

## Coda API Reference

### Base URL & Auth
- **Base:** `https://coda.io/apis/v1`
- **Auth:** `Authorization: Bearer <token>`

### Rate Limits
- Reads: 100 req / 6s
- Writes: 10 req / 6s
- Doc content writes: 5 req / 10s
- HTTP 429 when exceeded — back off and retry

### Key Endpoints

#### Rows (primary CRUD)
- `GET /docs/{docId}/tables/{tableId}/rows` — List rows
  - Params: `valueFormat` (simple|rich), `limit`, `pageToken`, `query`, `visibleOnly`
- `GET /docs/{docId}/tables/{tableId}/rows/{rowId}` — Get single row
  - Params: `valueFormat`
- `POST /docs/{docId}/tables/{tableId}/rows` — Insert/upsert rows
  - Body: `{ rows: [{ cells: [{column, value}] }], keyColumns?: [] }`
  - Returns **HTTP 202** (async) with `requestId` and `addedRowIds`
- `PUT /docs/{docId}/tables/{tableId}/rows/{rowId}` — Update row
  - Body: `{ row: { cells: [{column, value}] } }`
  - Returns **HTTP 202**
- `DELETE /docs/{docId}/tables/{tableId}/rows/{rowId}` — Delete row (202)

#### Tables & Columns
- `GET /docs/{docId}/tables` — List tables/views
- `GET /docs/{docId}/tables/{tableId}/columns` — List columns

#### Docs
- `GET /docs` — List accessible docs
- `GET /docs/{docId}` — Get doc metadata

### Value Formats
- **`simple`** — Plain strings/numbers (compact)
- **`simpleWithArrays`** — Simple + arrays for multi-select
- **`rich`** — Full JSON-LD with structured objects (use for lookups — returns `{name: "..."}`). This is what we use for project/status reads.

### Important Quirks
- **Writes are async (202):** Changes take seconds to propagate. Response includes `requestId`.
- **Lookup columns:** When writing, set by **row ID** (e.g., `"i-HWrLNgQ4jB"` for Active stage), not by name string.
- **Rich format lookups:** Returns JSON-LD objects like `{"@type": "StructuredValue", "name": "Active"}` — extract the `name` field.
- **IDs over names:** Always use column/table IDs (not display names) — names are fragile.
- **Upsert:** POST with `keyColumns` array matches existing rows; without it, always inserts.
- **Pagination:** `nextPageToken` in response, pass as `pageToken` in next request. Default limit is 25.

### Pagination Response Shape
```json
{
  "items": [...],
  "nextPageToken": "...",
  "nextPageLink": "https://...",
  "href": "https://..."
}
```

### Error Codes
- 200/202: Success (202 = async processing)
- 400: Invalid params
- 401: Bad token
- 403: No access
- 404: Not found
- 429: Rate limited

---

## Coda Document Structure (MONOFOCUS-HUB)

All IDs are in `src/lib/coda.ts`. Doc ID: `N2tIjWdJ-z`

### Tables
| Table | ID | Purpose |
|---|---|---|
| All projects | `grid-TqE3BT2kf9` | Main project tracker |
| All status updates | `grid-8AlDOLhgoZ` | Daily work log entries |
| Stages | `grid-2to8piPKuN` | Lifecycle stages lookup |
| Statuses | `grid-ccpfiS5FyX` | Traffic light lookup |
| Tags | `grid-95g-u3q1hk` | Category tags lookup |

### Stage Values (lifecycle)
Active, Planned, Idea, Complete, Blocked, Incomplete

### Status Values (traffic light — daily work log)
- On track (green) = dedicated time spent
- At risk (yellow) = some time spent
- Off track (red) = no time spent

### Tags
Physical, Fun, Life360, Personal

### Design Rules
- Only 1 project should be "Active" at a time
- Status updates default to yesterday's date (user checks in each morning)
- Error states show warning banners with quick-fix buttons
