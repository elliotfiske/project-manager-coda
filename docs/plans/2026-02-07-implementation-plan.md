# Project Manager Webapp — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a mobile-first Next.js webapp that reads/writes to a Coda project management document, with passkey auth and Playwright E2E tests.

**Architecture:** Next.js App Router with TypeScript + Tailwind CSS, deployed on Vercel. API routes proxy Coda API calls (token server-side). Passkey auth via SimpleWebAuthn. frappe-gantt for timeline. Playwright for E2E tests.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, @simplewebauthn/server + browser, frappe-gantt, Playwright, Vercel KV

**Design Doc:** `docs/plans/2026-02-07-project-manager-webapp-design.md`

---

## Team Structure

| Agent | Branch | Worktree | Tasks |
|---|---|---|---|
| Lead | `main` | `project-manager-coda/` | Task 0 (scaffold) |
| Backend | `backend` | `project-manager-coda-backend/` | Tasks 1-4 |
| Frontend | `frontend` | `project-manager-coda-frontend/` | Tasks 5-8 |
| QA | `qa` | `project-manager-coda-qa/` | Tasks 9-12 |
| Reviewer | (reads other worktrees) | — | Reviews all tasks |

**Merge order:** Backend tasks merge first (Frontend depends on API types). QA merges last.

---

## Task 0: Project Scaffold (Lead — `main`)

**Goal:** Set up the Next.js project with all shared infrastructure so agents can branch off.

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.ts`
- Create: `src/lib/types.ts` (shared TypeScript types)
- Create: `src/lib/coda.ts` (Coda API constants — table/column IDs)
- Create: `src/app/layout.tsx` (root layout with bottom tab nav)
- Create: `src/app/page.tsx` (home page placeholder)
- Create: `.env.local` (template for env vars)
- Create: `.gitignore`

**Step 1: Initialize Next.js project**

```bash
cd /Users/elliotfiske/projects/project-manager-coda
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

**Step 2: Create shared TypeScript types**

Create `src/lib/types.ts`:

```typescript
// Coda document structure types — shared by all agents

export interface Project {
  id: string;
  name: string;
  description: string;
  benefit: string;
  startDate: string; // ISO date string YYYY-MM-DD
  endDate: string;
  stage: StageName;
  tags: string[];
  recentStatus: StatusName | null;
  statusUpdates: StatusUpdate[];
}

export interface StatusUpdate {
  id: string;
  date: string; // ISO date string YYYY-MM-DD
  status: StatusName;
  update: string;
  initiativeId: string;
}

export type StageName = "Incomplete" | "Idea" | "Planned" | "Active" | "Complete" | "Blocked";

export type StatusName = "On track" | "At risk" | "Off track";

export interface LookupItem {
  id: string;
  name: string;
}

// API request types

export interface CreateProjectRequest {
  name: string;
  description: string;
  benefit: string;
  startDate: string;
  endDate: string;
  stage: StageName;
  tags: string[];
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  benefit?: string;
  startDate?: string;
  endDate?: string;
  stage?: StageName;
  tags?: string[];
}

export interface CreateStatusUpdateRequest {
  date: string;
  status: StatusName;
  update: string;
  initiativeId: string;
}

// API response types

export interface ActiveProjectResponse {
  project: Project | null;
  errors: ActiveProjectError[];
}

export type ActiveProjectError =
  | { type: "no_active"; message: string }
  | { type: "multiple_active"; message: string; projects: Pick<Project, "id" | "name">[] };
```

**Step 3: Create Coda constants**

Create `src/lib/coda.ts`:

```typescript
// Coda API constants — table and column IDs from the MONOFOCUS-HUB document

export const CODA_DOC_ID = "N2tIjWdJ-z";
export const CODA_API_BASE = "https://coda.io/apis/v1";

export const TABLES = {
  ALL_PROJECTS: "grid-TqE3BT2kf9",
  ALL_STATUS_UPDATES: "grid-8AlDOLhgoZ",
  STAGES: "grid-2to8piPKuN",
  STATUSES: "grid-ccpfiS5FyX",
  TAGS: "grid-95g-u3q1hk",
} as const;

export const COLUMNS = {
  // All projects table
  PROJECT_NAME: "c-MXIeKLNfrv",
  PROJECT_START_DATE: "c-lJkN-Zw_Eo",
  PROJECT_END_DATE: "c-N2NlgsAJTg",
  PROJECT_STAGE: "c-mz3yxJITqF",
  PROJECT_DESCRIPTION: "c-5fIGynImKW",
  PROJECT_BENEFIT: "c-vg5eSInGZH",
  PROJECT_TAGS: "c-Sdm6yCDzOz",
  PROJECT_ALL_STATUSES: "c-Z_k_Zxpckj",
  PROJECT_RECENT_STATUS: "c-bkokiGk7GO",
  PROJECT_RECENT_STATUS_LIGHT: "c-c07j7TRSmW",

  // All status updates table
  STATUS_UPDATE_TEXT: "c-qv73ymCy5Q",
  STATUS_UPDATE_STATUS: "c-hkG_smoQeT",
  STATUS_UPDATE_INITIATIVE: "c-hV9p0alsy9",
  STATUS_UPDATE_DATE: "c-hCMncW8frI",
} as const;

// Stage row IDs (for setting stage via API)
export const STAGE_ROW_IDS: Record<string, string> = {
  "Incomplete": "i-FC1bT1xy1i",
  "Idea": "i-Q8rfMkM8nT",
  "Planned": "i-SfYKs-eNGI",
  "Active": "i-HWrLNgQ4jB",
  "Complete": "i-4zWq2JLgo2",
  "Blocked": "i-quU2JjOP_C",
};

// Status row IDs (traffic light)
export const STATUS_ROW_IDS: Record<string, string> = {
  "On track": "i-uMgAiX6mHg",
  "At risk": "i-f5HM5p750g",
  "Off track": "i-a1HF1e9Tke",
};

// Tag row IDs
export const TAG_ROW_IDS: Record<string, string> = {
  "Physical": "i-410usZvjCp",
  "Fun": "i-jUe4HqvAke",
  "Life360": "i-ZQuQAAIJZE",
  "Personal": "i-D9be8Svlkc",
};
```

**Step 4: Create root layout with bottom tab nav**

Create `src/app/layout.tsx`:

```tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "Project Manager",
  description: "Mobile project manager powered by Coda",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 pb-16">
        <main className="min-h-screen">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
```

Create `src/components/BottomNav.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/timeline", label: "Timeline", icon: "📊" },
  { href: "/projects", label: "Projects", icon: "📋" },
  { href: "/new", label: "New", icon: "➕" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center h-16 z-50">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-col items-center justify-center flex-1 h-full text-xs ${
              isActive ? "text-blue-600 font-semibold" : "text-gray-500"
            }`}
          >
            <span className="text-xl">{tab.icon}</span>
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
```

**Step 5: Create placeholder pages**

Create `src/app/page.tsx`:
```tsx
export default function HomePage() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Active Project</h1>
      <p className="text-gray-500 mt-2">Loading...</p>
    </div>
  );
}
```

Create `src/app/timeline/page.tsx`:
```tsx
export default function TimelinePage() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Timeline</h1>
      <p className="text-gray-500 mt-2">Loading...</p>
    </div>
  );
}
```

Create `src/app/projects/page.tsx`:
```tsx
export default function ProjectsPage() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">All Projects</h1>
      <p className="text-gray-500 mt-2">Loading...</p>
    </div>
  );
}
```

Create `src/app/new/page.tsx`:
```tsx
export default function NewProjectPage() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">New Project</h1>
      <p className="text-gray-500 mt-2">Loading...</p>
    </div>
  );
}
```

**Step 6: Create env template and update .gitignore**

Create `.env.local`:
```
CODA_API_TOKEN=your-coda-api-token-here
SETUP_SECRET=your-one-time-setup-secret
KV_URL=your-vercel-kv-url
KV_REST_API_URL=your-vercel-kv-rest-api-url
KV_REST_API_TOKEN=your-vercel-kv-rest-api-token
KV_REST_API_READ_ONLY_TOKEN=your-vercel-kv-read-only-token
SESSION_SECRET=your-random-session-secret-at-least-32-chars
```

Update `.gitignore` to include:
```
.env.local
.env*.local
node_modules/
.next/
```

**Step 7: Verify build and commit**

```bash
npm run build
git init
git add -A
git commit -m "feat: scaffold Next.js project with shared types and layout"
```

---

## Task 1: Coda API Client (Backend — `backend` branch)

**Goal:** Build a typed client that wraps all Coda API calls, transforming raw Coda responses into our clean `Project` and `StatusUpdate` types.

**Files:**
- Create: `src/lib/coda-client.ts`

**Step 1: Create the Coda client**

Create `src/lib/coda-client.ts`:

```typescript
import { CODA_API_BASE, CODA_DOC_ID, TABLES, COLUMNS, STAGE_ROW_IDS, STATUS_ROW_IDS, TAG_ROW_IDS } from "./coda";
import type { Project, StatusUpdate, LookupItem, CreateProjectRequest, UpdateProjectRequest, CreateStatusUpdateRequest, StageName, StatusName } from "./types";

const TOKEN = process.env.CODA_API_TOKEN!;

async function codaFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${CODA_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Coda API error ${res.status}: ${body}`);
  }
  return res.json();
}

function parseDate(codaDate: string): string {
  if (!codaDate) return "";
  // Coda returns ISO dates like "2026-02-06T00:00:00.000-08:00"
  return codaDate.split("T")[0];
}

function parseLookupName(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null && "name" in value) {
    return (value as { name: string }).name;
  }
  return "";
}

function parseLookupNames(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(parseLookupName).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((s) => s.trim()).filter(Boolean);
  return [parseLookupName(value)].filter(Boolean);
}

function rowToProject(row: Record<string, unknown>): Omit<Project, "statusUpdates"> {
  const values = row.values as Record<string, unknown>;
  return {
    id: row.id as string,
    name: ((row.name as string) || parseLookupName(values[COLUMNS.PROJECT_NAME])).replace(/```/g, ""),
    description: String(values[COLUMNS.PROJECT_DESCRIPTION] || ""),
    benefit: String(values[COLUMNS.PROJECT_BENEFIT] || ""),
    startDate: parseDate(String(values[COLUMNS.PROJECT_START_DATE] || "")),
    endDate: parseDate(String(values[COLUMNS.PROJECT_END_DATE] || "")),
    stage: parseLookupName(values[COLUMNS.PROJECT_STAGE]) as StageName,
    tags: parseLookupNames(values[COLUMNS.PROJECT_TAGS]),
    recentStatus: (parseLookupName(values[COLUMNS.PROJECT_RECENT_STATUS_LIGHT]) || null) as StatusName | null,
  };
}

function rowToStatusUpdate(row: Record<string, unknown>): StatusUpdate {
  const values = row.values as Record<string, unknown>;
  return {
    id: row.id as string,
    date: parseDate(String(values[COLUMNS.STATUS_UPDATE_DATE] || "")),
    status: parseLookupName(values[COLUMNS.STATUS_UPDATE_STATUS]) as StatusName,
    update: String(values[COLUMNS.STATUS_UPDATE_TEXT] || ""),
    initiativeId: parseLookupName(values[COLUMNS.STATUS_UPDATE_INITIATIVE]),
  };
}

// --- Public API ---

export async function listProjects(): Promise<Omit<Project, "statusUpdates">[]> {
  const data = await codaFetch(
    `/docs/${CODA_DOC_ID}/tables/${TABLES.ALL_PROJECTS}/rows?valueFormat=rich&limit=200`
  );
  return data.items.map(rowToProject);
}

export async function getProject(id: string): Promise<Project> {
  const [rowData, statusData] = await Promise.all([
    codaFetch(
      `/docs/${CODA_DOC_ID}/tables/${TABLES.ALL_PROJECTS}/rows/${id}?valueFormat=rich`
    ),
    codaFetch(
      `/docs/${CODA_DOC_ID}/tables/${TABLES.ALL_STATUS_UPDATES}/rows?valueFormat=rich&limit=200`
    ),
  ]);

  const project = rowToProject(rowData);

  // Filter status updates for this project
  const allUpdates: StatusUpdate[] = statusData.items.map(rowToStatusUpdate);
  const projectUpdates = allUpdates
    .filter((u) => u.initiativeId === project.name)
    .sort((a, b) => b.date.localeCompare(a.date));

  return { ...project, statusUpdates: projectUpdates };
}

export async function getActiveProjects(): Promise<Omit<Project, "statusUpdates">[]> {
  const projects = await listProjects();
  return projects.filter((p) => p.stage === "Active");
}

export async function createProject(req: CreateProjectRequest): Promise<{ id: string }> {
  const cells = [
    { column: COLUMNS.PROJECT_NAME, value: req.name },
    { column: COLUMNS.PROJECT_DESCRIPTION, value: req.description },
    { column: COLUMNS.PROJECT_BENEFIT, value: req.benefit },
    { column: COLUMNS.PROJECT_START_DATE, value: req.startDate },
    { column: COLUMNS.PROJECT_END_DATE, value: req.endDate },
    { column: COLUMNS.PROJECT_STAGE, value: STAGE_ROW_IDS[req.stage] },
    { column: COLUMNS.PROJECT_TAGS, value: req.tags.map((t) => TAG_ROW_IDS[t]).filter(Boolean) },
  ];

  const data = await codaFetch(
    `/docs/${CODA_DOC_ID}/tables/${TABLES.ALL_PROJECTS}/rows`,
    { method: "POST", body: JSON.stringify({ rows: [{ cells }] }) }
  );

  return { id: data.addedRowIds?.[0] || "" };
}

export async function updateProject(id: string, req: UpdateProjectRequest): Promise<void> {
  const values: Record<string, unknown> = {};
  if (req.name !== undefined) values[COLUMNS.PROJECT_NAME] = req.name;
  if (req.description !== undefined) values[COLUMNS.PROJECT_DESCRIPTION] = req.description;
  if (req.benefit !== undefined) values[COLUMNS.PROJECT_BENEFIT] = req.benefit;
  if (req.startDate !== undefined) values[COLUMNS.PROJECT_START_DATE] = req.startDate;
  if (req.endDate !== undefined) values[COLUMNS.PROJECT_END_DATE] = req.endDate;
  if (req.stage !== undefined) values[COLUMNS.PROJECT_STAGE] = STAGE_ROW_IDS[req.stage];
  if (req.tags !== undefined) values[COLUMNS.PROJECT_TAGS] = req.tags.map((t) => TAG_ROW_IDS[t]).filter(Boolean);

  await codaFetch(
    `/docs/${CODA_DOC_ID}/tables/${TABLES.ALL_PROJECTS}/rows/${id}`,
    { method: "PUT", body: JSON.stringify({ row: { cells: Object.entries(values).map(([column, value]) => ({ column, value })) } }) }
  );
}

export async function createStatusUpdate(req: CreateStatusUpdateRequest): Promise<void> {
  const cells = [
    { column: COLUMNS.STATUS_UPDATE_DATE, value: req.date },
    { column: COLUMNS.STATUS_UPDATE_STATUS, value: STATUS_ROW_IDS[req.status] },
    { column: COLUMNS.STATUS_UPDATE_TEXT, value: req.update },
    { column: COLUMNS.STATUS_UPDATE_INITIATIVE, value: req.initiativeId },
  ];

  await codaFetch(
    `/docs/${CODA_DOC_ID}/tables/${TABLES.ALL_STATUS_UPDATES}/rows`,
    { method: "POST", body: JSON.stringify({ rows: [{ cells }] }) }
  );
}

export async function listStages(): Promise<LookupItem[]> {
  const data = await codaFetch(
    `/docs/${CODA_DOC_ID}/tables/${TABLES.STAGES}/rows?valueFormat=simple&limit=50`
  );
  return data.items.map((row: Record<string, unknown>) => ({
    id: row.id as string,
    name: row.name as string,
  }));
}

export async function listTags(): Promise<LookupItem[]> {
  const data = await codaFetch(
    `/docs/${CODA_DOC_ID}/tables/${TABLES.TAGS}/rows?valueFormat=simple&limit=50`
  );
  return data.items.map((row: Record<string, unknown>) => ({
    id: row.id as string,
    name: row.name as string,
  }));
}

export async function listStatuses(): Promise<LookupItem[]> {
  const data = await codaFetch(
    `/docs/${CODA_DOC_ID}/tables/${TABLES.STATUSES}/rows?valueFormat=simple&limit=50`
  );
  return data.items.map((row: Record<string, unknown>) => ({
    id: row.id as string,
    name: row.name as string,
  }));
}
```

**Step 2: Commit**

```bash
git add src/lib/coda-client.ts
git commit -m "feat: add Coda API client with typed wrappers"
```

---

## Task 2: API Routes (Backend — `backend` branch)

**Goal:** Create all Next.js API route handlers that proxy the Coda client.

**Files:**
- Create: `src/app/api/projects/route.ts`
- Create: `src/app/api/projects/[id]/route.ts`
- Create: `src/app/api/projects/active/route.ts`
- Create: `src/app/api/status-updates/route.ts`
- Create: `src/app/api/stages/route.ts`
- Create: `src/app/api/tags/route.ts`
- Create: `src/app/api/statuses/route.ts`

**Step 1: Create project routes**

Create `src/app/api/projects/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { listProjects, createProject } from "@/lib/coda-client";
import type { CreateProjectRequest } from "@/lib/types";

export async function GET() {
  try {
    const projects = await listProjects();
    return NextResponse.json(projects);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateProjectRequest = await request.json();
    const result = await createProject(body);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
```

Create `src/app/api/projects/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getProject, updateProject } from "@/lib/coda-client";
import type { UpdateProjectRequest } from "@/lib/types";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const project = await getProject(id);
    return NextResponse.json(project);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body: UpdateProjectRequest = await request.json();
    await updateProject(id, body);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
```

Create `src/app/api/projects/active/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getActiveProjects } from "@/lib/coda-client";
import type { ActiveProjectResponse } from "@/lib/types";

export async function GET() {
  try {
    const activeProjects = await getActiveProjects();

    const response: ActiveProjectResponse = {
      project: null,
      errors: [],
    };

    if (activeProjects.length === 0) {
      response.errors.push({ type: "no_active", message: "No active projects found" });
    } else if (activeProjects.length > 1) {
      response.errors.push({
        type: "multiple_active",
        message: `${activeProjects.length} active projects found`,
        projects: activeProjects.map((p) => ({ id: p.id, name: p.name })),
      });
    }

    if (activeProjects.length >= 1) {
      response.project = { ...activeProjects[0], statusUpdates: [] };
    }

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
```

Create `src/app/api/status-updates/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createStatusUpdate } from "@/lib/coda-client";
import type { CreateStatusUpdateRequest } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body: CreateStatusUpdateRequest = await request.json();
    await createStatusUpdate(body);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
```

Create `src/app/api/stages/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { listStages } from "@/lib/coda-client";

let cachedStages: Awaited<ReturnType<typeof listStages>> | null = null;

export async function GET() {
  try {
    if (!cachedStages) {
      cachedStages = await listStages();
    }
    return NextResponse.json(cachedStages);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
```

Create `src/app/api/tags/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { listTags } from "@/lib/coda-client";

let cachedTags: Awaited<ReturnType<typeof listTags>> | null = null;

export async function GET() {
  try {
    if (!cachedTags) {
      cachedTags = await listTags();
    }
    return NextResponse.json(cachedTags);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
```

Create `src/app/api/statuses/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { listStatuses } from "@/lib/coda-client";

let cachedStatuses: Awaited<ReturnType<typeof listStatuses>> | null = null;

export async function GET() {
  try {
    if (!cachedStatuses) {
      cachedStatuses = await listStatuses();
    }
    return NextResponse.json(cachedStatuses);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
```

**Step 2: Verify build**

```bash
npm run build
```

**Step 3: Commit**

```bash
git add src/app/api/
git commit -m "feat: add all API route handlers"
```

---

## Task 3: Auth — Passkey Registration & Login (Backend — `backend` branch)

**Goal:** Implement WebAuthn passkey registration and login with session cookies.

**Files:**
- Create: `src/lib/auth.ts` (session helpers, WebAuthn config)
- Create: `src/lib/kv.ts` (Vercel KV wrapper for credential storage)
- Create: `src/app/api/auth/register-options/route.ts`
- Create: `src/app/api/auth/register-verify/route.ts`
- Create: `src/app/api/auth/login-options/route.ts`
- Create: `src/app/api/auth/login-verify/route.ts`
- Create: `src/middleware.ts` (protect all routes except /login, /setup, /api/auth)

**Dependencies to install:**

```bash
npm install @simplewebauthn/server @simplewebauthn/browser @vercel/kv jose
```

- `@simplewebauthn/server` — server-side WebAuthn verification
- `@simplewebauthn/browser` — browser-side WebAuthn API (used by frontend)
- `@vercel/kv` — Vercel KV client for credential storage
- `jose` — JWT signing/verification for session cookies

**Step 1: Create auth helpers**

Create `src/lib/auth.ts`:

```typescript
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { GenerateRegistrationOptionsOpts, GenerateAuthenticationOptionsOpts } from "@simplewebauthn/server";

const SESSION_SECRET = new TextEncoder().encode(process.env.SESSION_SECRET!);
const SESSION_COOKIE = "pm-session";
const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

export const rpName = "Project Manager";
export const rpID = process.env.NODE_ENV === "production"
  ? process.env.NEXT_PUBLIC_RP_ID || "your-app.vercel.app"
  : "localhost";
export const origin = process.env.NODE_ENV === "production"
  ? `https://${rpID}`
  : "http://localhost:3000";

export async function createSession(): Promise<string> {
  const token = await new SignJWT({ authenticated: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(SESSION_SECRET);
  return token;
}

export async function verifySession(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, SESSION_SECRET);
    return true;
  } catch {
    return false;
  }
}

export async function getSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  return verifySession(token);
}

export function sessionCookieOptions(token: string) {
  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: SESSION_MAX_AGE,
    path: "/",
  };
}
```

Create `src/lib/kv.ts`:

```typescript
import { kv } from "@vercel/kv";

// For local development without Vercel KV, fall back to in-memory storage
const memoryStore = new Map<string, string>();
const useMemory = !process.env.KV_REST_API_URL;

export async function kvGet(key: string): Promise<string | null> {
  if (useMemory) return memoryStore.get(key) || null;
  return kv.get(key);
}

export async function kvSet(key: string, value: string): Promise<void> {
  if (useMemory) {
    memoryStore.set(key, value);
    return;
  }
  await kv.set(key, value);
}

// Credential storage keys
export const KV_KEYS = {
  CREDENTIAL: "webauthn:credential",
  CHALLENGE: "webauthn:challenge",
  REGISTERED: "webauthn:registered",
};
```

**Step 2: Create auth API routes**

Create `src/app/api/auth/register-options/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { rpName, rpID } from "@/lib/auth";
import { kvGet, kvSet, KV_KEYS } from "@/lib/kv";

export async function POST(request: NextRequest) {
  try {
    const { secret } = await request.json();

    // Verify setup secret
    if (secret !== process.env.SETUP_SECRET) {
      return NextResponse.json({ error: "Invalid setup secret" }, { status: 403 });
    }

    // Check if already registered
    const registered = await kvGet(KV_KEYS.REGISTERED);
    if (registered) {
      return NextResponse.json({ error: "Already registered" }, { status: 400 });
    }

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userName: "admin",
      attestationType: "none",
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
      },
    });

    // Store challenge for verification
    await kvSet(KV_KEYS.CHALLENGE, options.challenge);

    return NextResponse.json(options);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
```

Create `src/app/api/auth/register-verify/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { rpID, origin, createSession, sessionCookieOptions } from "@/lib/auth";
import { kvGet, kvSet, KV_KEYS } from "@/lib/kv";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const expectedChallenge = await kvGet(KV_KEYS.CHALLENGE);

    if (!expectedChallenge) {
      return NextResponse.json({ error: "No challenge found" }, { status: 400 });
    }

    const verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ error: "Verification failed" }, { status: 400 });
    }

    // Store credential
    const { credential } = verification.registrationInfo;
    await kvSet(KV_KEYS.CREDENTIAL, JSON.stringify({
      id: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString("base64"),
      counter: credential.counter,
    }));
    await kvSet(KV_KEYS.REGISTERED, "true");

    // Create session
    const token = await createSession();
    const cookieStore = await cookies();
    cookieStore.set(sessionCookieOptions(token));

    return NextResponse.json({ verified: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
```

Create `src/app/api/auth/login-options/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { rpID } from "@/lib/auth";
import { kvGet, kvSet, KV_KEYS } from "@/lib/kv";

export async function POST() {
  try {
    const credentialJson = await kvGet(KV_KEYS.CREDENTIAL);
    if (!credentialJson) {
      return NextResponse.json({ error: "No credential registered" }, { status: 400 });
    }

    const credential = JSON.parse(credentialJson);

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: [{ id: credential.id }],
      userVerification: "preferred",
    });

    await kvSet(KV_KEYS.CHALLENGE, options.challenge);

    return NextResponse.json(options);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
```

Create `src/app/api/auth/login-verify/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { rpID, origin, createSession, sessionCookieOptions } from "@/lib/auth";
import { kvGet, kvSet, KV_KEYS } from "@/lib/kv";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const expectedChallenge = await kvGet(KV_KEYS.CHALLENGE);
    const credentialJson = await kvGet(KV_KEYS.CREDENTIAL);

    if (!expectedChallenge || !credentialJson) {
      return NextResponse.json({ error: "Missing challenge or credential" }, { status: 400 });
    }

    const credential = JSON.parse(credentialJson);

    const verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: credential.id,
        publicKey: Uint8Array.from(Buffer.from(credential.publicKey, "base64")),
        counter: credential.counter,
      },
    });

    if (!verification.verified) {
      return NextResponse.json({ error: "Verification failed" }, { status: 400 });
    }

    // Update counter
    await kvSet(KV_KEYS.CREDENTIAL, JSON.stringify({
      ...credential,
      counter: verification.authenticationInfo.newCounter,
    }));

    // Create session
    const token = await createSession();
    const cookieStore = await cookies();
    cookieStore.set(sessionCookieOptions(token));

    return NextResponse.json({ verified: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
```

**Step 3: Create middleware**

Create `src/middleware.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/setup", "/api/auth"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Check session cookie
  const token = request.cookies.get("pm-session")?.value;
  if (!token || !(await verifySession(token))) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

**Step 4: Verify build and commit**

```bash
npm run build
git add -A
git commit -m "feat: add passkey auth with registration, login, and session middleware"
```

---

## Task 4: Auth Pages (Backend — `backend` branch)

**Goal:** Create the /login and /setup pages.

**Files:**
- Create: `src/app/login/page.tsx`
- Create: `src/app/setup/page.tsx`

**Step 1: Create login page**

Create `src/app/login/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { startAuthentication } from "@simplewebauthn/browser";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin() {
    setError("");
    setLoading(true);
    try {
      const optionsRes = await fetch("/api/auth/login-options", { method: "POST" });
      if (!optionsRes.ok) {
        const data = await optionsRes.json();
        throw new Error(data.error || "Failed to get login options");
      }
      const options = await optionsRes.json();

      const credential = await startAuthentication({ optionsJSON: options });

      const verifyRes = await fetch("/api/auth/login-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credential),
      });

      if (!verifyRes.ok) {
        const data = await verifyRes.json();
        throw new Error(data.error || "Login failed");
      }

      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <h1 className="text-2xl font-bold mb-8">Project Manager</h1>
      <button
        onClick={handleLogin}
        disabled={loading}
        className="bg-blue-600 text-white px-8 py-4 rounded-xl text-lg font-semibold disabled:opacity-50"
      >
        {loading ? "Signing in..." : "Sign in with Passkey"}
      </button>
      {error && <p className="text-red-500 mt-4 text-center">{error}</p>}
    </div>
  );
}
```

**Step 2: Create setup page**

Create `src/app/setup/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { startRegistration } from "@simplewebauthn/browser";
import { useRouter } from "next/navigation";

export default function SetupPage() {
  const [secret, setSecret] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  async function handleRegister() {
    setError("");
    setLoading(true);
    try {
      const optionsRes = await fetch("/api/auth/register-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret }),
      });

      if (!optionsRes.ok) {
        const data = await optionsRes.json();
        throw new Error(data.error || "Failed to get registration options");
      }

      const options = await optionsRes.json();
      const credential = await startRegistration({ optionsJSON: options });

      const verifyRes = await fetch("/api/auth/register-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credential),
      });

      if (!verifyRes.ok) {
        const data = await verifyRes.json();
        throw new Error(data.error || "Registration failed");
      }

      setSuccess(true);
      setTimeout(() => router.push("/"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold mb-4">Passkey Registered!</h1>
        <p className="text-gray-500">Redirecting to home...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <h1 className="text-2xl font-bold mb-8">First-Time Setup</h1>
      <input
        type="password"
        value={secret}
        onChange={(e) => setSecret(e.target.value)}
        placeholder="Enter setup secret"
        className="border border-gray-300 rounded-lg px-4 py-3 mb-4 w-full max-w-xs text-center"
      />
      <button
        onClick={handleRegister}
        disabled={loading || !secret}
        className="bg-blue-600 text-white px-8 py-4 rounded-xl text-lg font-semibold disabled:opacity-50"
      >
        {loading ? "Registering..." : "Register Passkey"}
      </button>
      {error && <p className="text-red-500 mt-4 text-center">{error}</p>}
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add src/app/login/ src/app/setup/
git commit -m "feat: add login and setup pages for passkey auth"
```

---

## Task 5: Home / Active Project View (Frontend — `frontend` branch)

**Goal:** Build the home page showing the active project, quick status entry form, and error states.

**Files:**
- Create: `src/app/page.tsx` (replace placeholder)
- Create: `src/components/ActiveProjectCard.tsx`
- Create: `src/components/StatusEntryForm.tsx`
- Create: `src/components/StatusUpdateList.tsx`
- Create: `src/components/ActiveProjectErrors.tsx`
- Create: `src/lib/api.ts` (frontend fetch helpers)

**Step 1: Create frontend API helpers**

Create `src/lib/api.ts`:

```typescript
import type {
  Project,
  ActiveProjectResponse,
  CreateStatusUpdateRequest,
  CreateProjectRequest,
  UpdateProjectRequest,
  LookupItem,
} from "./types";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `API error: ${res.status}`);
  }
  return res.json();
}

export const api = {
  getActiveProject: () => apiFetch<ActiveProjectResponse>("/api/projects/active"),
  listProjects: () => apiFetch<Omit<Project, "statusUpdates">[]>("/api/projects"),
  getProject: (id: string) => apiFetch<Project>(`/api/projects/${id}`),
  createProject: (data: CreateProjectRequest) =>
    apiFetch<{ id: string }>("/api/projects", { method: "POST", body: JSON.stringify(data) }),
  updateProject: (id: string, data: UpdateProjectRequest) =>
    apiFetch<{ success: boolean }>(`/api/projects/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  createStatusUpdate: (data: CreateStatusUpdateRequest) =>
    apiFetch<{ success: boolean }>("/api/status-updates", { method: "POST", body: JSON.stringify(data) }),
  listStages: () => apiFetch<LookupItem[]>("/api/stages"),
  listTags: () => apiFetch<LookupItem[]>("/api/tags"),
  listStatuses: () => apiFetch<LookupItem[]>("/api/statuses"),
};
```

**Step 2: Create components and home page**

Create `src/components/ActiveProjectCard.tsx`:

```tsx
import type { Project } from "@/lib/types";
import Link from "next/link";

const stageBadgeColors: Record<string, string> = {
  Active: "bg-green-100 text-green-800",
  Planned: "bg-blue-100 text-blue-800",
  Idea: "bg-yellow-100 text-yellow-800",
  Complete: "bg-gray-100 text-gray-800",
  Blocked: "bg-red-100 text-red-800",
  Incomplete: "bg-orange-100 text-orange-800",
};

export function ActiveProjectCard({ project }: { project: Project }) {
  return (
    <Link href={`/projects/${project.id}`} className="block">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold truncate">{project.name}</h2>
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${stageBadgeColors[project.stage] || "bg-gray-100"}`}>
            {project.stage}
          </span>
        </div>
        <p className="text-sm text-gray-500 mb-1">
          {project.startDate} — {project.endDate}
        </p>
        {project.description && (
          <p className="text-sm text-gray-700 line-clamp-2">{project.description}</p>
        )}
      </div>
    </Link>
  );
}
```

Create `src/components/StatusEntryForm.tsx`:

```tsx
"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import type { StatusName } from "@/lib/types";

function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

const statusOptions: { name: StatusName; emoji: string; color: string }[] = [
  { name: "On track", emoji: "🟢", color: "bg-green-100 border-green-400 text-green-800" },
  { name: "At risk", emoji: "🟡", color: "bg-yellow-100 border-yellow-400 text-yellow-800" },
  { name: "Off track", emoji: "🔴", color: "bg-red-100 border-red-400 text-red-800" },
];

interface Props {
  initiativeId: string;
  projectName: string;
  onSubmitted: () => void;
}

export function StatusEntryForm({ initiativeId, projectName, onSubmitted }: Props) {
  const [date, setDate] = useState(getYesterday());
  const [status, setStatus] = useState<StatusName | null>(null);
  const [update, setUpdate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!status) return;
    setSubmitting(true);
    setError("");
    try {
      await api.createStatusUpdate({
        date,
        status,
        update,
        initiativeId: projectName,
      });
      setStatus(null);
      setUpdate("");
      setDate(getYesterday());
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <h3 className="font-semibold mb-3">Log Status Update</h3>

      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-3 text-sm"
      />

      <div className="flex gap-2 mb-3">
        {statusOptions.map((opt) => (
          <button
            key={opt.name}
            onClick={() => setStatus(opt.name)}
            className={`flex-1 py-3 rounded-lg border-2 text-center text-sm font-medium transition-all ${
              status === opt.name ? opt.color + " border-current" : "bg-gray-50 border-gray-200 text-gray-600"
            }`}
          >
            <span className="text-lg block">{opt.emoji}</span>
            {opt.name}
          </button>
        ))}
      </div>

      <textarea
        value={update}
        onChange={(e) => setUpdate(e.target.value)}
        placeholder="What did you work on? (optional)"
        rows={2}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-3 text-sm resize-none"
      />

      <button
        onClick={handleSubmit}
        disabled={!status || submitting}
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold disabled:opacity-50"
      >
        {submitting ? "Submitting..." : "Log Update"}
      </button>

      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </div>
  );
}
```

Create `src/components/StatusUpdateList.tsx`:

```tsx
import type { StatusUpdate } from "@/lib/types";

const statusEmoji: Record<string, string> = {
  "On track": "🟢",
  "At risk": "🟡",
  "Off track": "🔴",
};

export function StatusUpdateList({ updates }: { updates: StatusUpdate[] }) {
  if (updates.length === 0) {
    return <p className="text-gray-400 text-sm text-center py-4">No status updates yet</p>;
  }

  return (
    <div className="space-y-2">
      {updates.map((u) => (
        <div key={u.id} className="bg-white rounded-lg border border-gray-200 p-3 flex gap-3">
          <span className="text-lg">{statusEmoji[u.status] || "⚪"}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500">{u.date}</p>
            {u.update && <p className="text-sm text-gray-700 mt-0.5">{u.update}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
```

Create `src/components/ActiveProjectErrors.tsx`:

```tsx
"use client";

import { api } from "@/lib/api";
import type { ActiveProjectError } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ActiveProjectErrors({ errors }: { errors: ActiveProjectError[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSetOnlyActive(id: string) {
    setLoading(true);
    try {
      // Set all other active projects to Planned
      const multipleError = errors.find((e) => e.type === "multiple_active");
      if (multipleError && multipleError.type === "multiple_active") {
        for (const p of multipleError.projects) {
          if (p.id !== id) {
            await api.updateProject(p.id, { stage: "Planned" });
          }
        }
      }
      router.refresh();
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      {errors.map((err, i) => (
        <div key={i} className="bg-amber-50 border border-amber-300 rounded-xl p-4">
          <p className="text-amber-800 font-medium text-sm">{err.message}</p>
          {err.type === "no_active" && (
            <button
              onClick={() => router.push("/new")}
              className="mt-2 text-sm bg-amber-600 text-white px-4 py-2 rounded-lg"
            >
              Create New Project
            </button>
          )}
          {err.type === "multiple_active" && (
            <div className="mt-2 space-y-1">
              {err.projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSetOnlyActive(p.id)}
                  disabled={loading}
                  className="block text-sm text-amber-700 underline disabled:opacity-50"
                >
                  Keep only &quot;{p.name}&quot; active
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

Replace `src/app/page.tsx`:

```tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import type { ActiveProjectResponse, Project } from "@/lib/types";
import { ActiveProjectCard } from "@/components/ActiveProjectCard";
import { StatusEntryForm } from "@/components/StatusEntryForm";
import { StatusUpdateList } from "@/components/StatusUpdateList";
import { ActiveProjectErrors } from "@/components/ActiveProjectErrors";

export default function HomePage() {
  const [data, setData] = useState<ActiveProjectResponse | null>(null);
  const [fullProject, setFullProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const activeData = await api.getActiveProject();
      setData(activeData);
      if (activeData.project) {
        const full = await api.getProject(activeData.project.id);
        setFullProject(full);
      }
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return <div className="p-4"><p className="text-gray-500">Loading...</p></div>;
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Active Project</h1>

      {data?.errors && data.errors.length > 0 && (
        <ActiveProjectErrors errors={data.errors} />
      )}

      {fullProject && (
        <>
          <ActiveProjectCard project={fullProject} />
          <StatusEntryForm
            initiativeId={fullProject.id}
            projectName={fullProject.name}
            onSubmitted={loadData}
          />
          <h3 className="font-semibold text-gray-700">Recent Updates</h3>
          <StatusUpdateList updates={fullProject.statusUpdates.slice(0, 7)} />
        </>
      )}

      {!data?.project && data?.errors.length === 0 && (
        <p className="text-gray-500">No active project found.</p>
      )}
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add src/app/page.tsx src/components/ src/lib/api.ts
git commit -m "feat: add home view with active project card, status entry, and error states"
```

---

## Task 6: Timeline View (Frontend — `frontend` branch)

**Goal:** Build the timeline page with frappe-gantt.

**Files:**
- Create: `src/app/timeline/page.tsx` (replace placeholder)
- Create: `src/components/GanttChart.tsx`

**Dependencies:**

```bash
npm install frappe-gantt
```

**Step 1: Create Gantt wrapper component**

Create `src/components/GanttChart.tsx`:

```tsx
"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Project } from "@/lib/types";

const stageColors: Record<string, string> = {
  Active: "#22c55e",
  Planned: "#3b82f6",
  Idea: "#eab308",
  Complete: "#9ca3af",
  Blocked: "#ef4444",
  Incomplete: "#f97316",
};

interface Props {
  projects: Omit<Project, "statusUpdates">[];
}

export function GanttChart({ projects }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ganttRef = useRef<unknown>(null);
  const router = useRouter();

  useEffect(() => {
    if (!containerRef.current || projects.length === 0) return;

    // Dynamic import to avoid SSR issues
    import("frappe-gantt").then(({ default: Gantt }) => {
      // Clear previous
      containerRef.current!.innerHTML = "";

      const tasks = projects
        .filter((p) => p.startDate && p.endDate)
        .map((p) => ({
          id: p.id,
          name: p.name,
          start: p.startDate,
          end: p.endDate,
          progress: p.stage === "Complete" ? 100 : 0,
          custom_class: `stage-${p.stage.toLowerCase()}`,
        }));

      if (tasks.length === 0) return;

      ganttRef.current = new Gantt(containerRef.current!, tasks, {
        view_mode: "Week",
        readonly: true,
        on_click: (task: { id: string }) => {
          router.push(`/projects/${task.id}`);
        },
      });
    });
  }, [projects, router]);

  return (
    <>
      <style>{`
        ${Object.entries(stageColors)
          .map(
            ([stage, color]) =>
              `.stage-${stage.toLowerCase()} .bar { fill: ${color} !important; }
               .stage-${stage.toLowerCase()} .bar-progress { fill: ${color} !important; }`
          )
          .join("\n")}
      `}</style>
      <div ref={containerRef} className="overflow-x-auto" />
    </>
  );
}
```

**Step 2: Replace timeline page**

Replace `src/app/timeline/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Project } from "@/lib/types";
import { GanttChart } from "@/components/GanttChart";

export default function TimelinePage() {
  const [projects, setProjects] = useState<Omit<Project, "statusUpdates">[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listProjects()
      .then(setProjects)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-4"><p className="text-gray-500">Loading timeline...</p></div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Timeline</h1>
      {projects.length === 0 ? (
        <p className="text-gray-500">No projects found.</p>
      ) : (
        <GanttChart projects={projects} />
      )}
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add src/app/timeline/ src/components/GanttChart.tsx
git commit -m "feat: add timeline view with frappe-gantt"
```

---

## Task 7: Project Detail / Edit View (Frontend — `frontend` branch)

**Goal:** Build the project detail page with editable fields and status update list.

**Files:**
- Create: `src/app/projects/[id]/page.tsx`
- Create: `src/components/ProjectEditForm.tsx`

**Step 1: Create project edit form**

Create `src/components/ProjectEditForm.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import type { Project, LookupItem, StageName } from "@/lib/types";

interface Props {
  project: Project;
  onSaved: () => void;
}

export function ProjectEditForm({ project, onSaved }: Props) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);
  const [benefit, setBenefit] = useState(project.benefit);
  const [startDate, setStartDate] = useState(project.startDate);
  const [endDate, setEndDate] = useState(project.endDate);
  const [stage, setStage] = useState<StageName>(project.stage);
  const [tags, setTags] = useState<string[]>(project.tags);
  const [saving, setSaving] = useState(false);
  const [stages, setStages] = useState<LookupItem[]>([]);
  const [allTags, setAllTags] = useState<LookupItem[]>([]);

  useEffect(() => {
    api.listStages().then(setStages);
    api.listTags().then(setAllTags);
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await api.updateProject(project.id, {
        name, description, benefit, startDate, endDate, stage, tags,
      });
      onSaved();
    } catch {
      // handle error
    } finally {
      setSaving(false);
    }
  }

  function toggleTag(tagName: string) {
    setTags((prev) =>
      prev.includes(tagName) ? prev.filter((t) => t !== tagName) : [...prev, tagName]
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)}
          rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Benefit</label>
        <textarea value={benefit} onChange={(e) => setBenefit(e.target.value)}
          rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
        <select value={stage} onChange={(e) => setStage(e.target.value as StageName)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
          {stages.map((s) => (
            <option key={s.id} value={s.name}>{s.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
        <div className="flex flex-wrap gap-2">
          {allTags.map((t) => (
            <button key={t.id} onClick={() => toggleTag(t.name)}
              className={`px-3 py-1 rounded-full text-sm border ${
                tags.includes(t.name)
                  ? "bg-blue-100 border-blue-400 text-blue-800"
                  : "bg-gray-50 border-gray-200 text-gray-600"
              }`}>
              {t.name}
            </button>
          ))}
        </div>
      </div>

      <button onClick={handleSave} disabled={saving}
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold disabled:opacity-50">
        {saving ? "Saving..." : "Save Changes"}
      </button>
    </div>
  );
}
```

**Step 2: Create project detail page**

Create `src/app/projects/[id]/page.tsx`:

```tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import type { Project } from "@/lib/types";
import { ProjectEditForm } from "@/components/ProjectEditForm";
import { StatusEntryForm } from "@/components/StatusEntryForm";
import { StatusUpdateList } from "@/components/StatusUpdateList";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProject = useCallback(async () => {
    try {
      const data = await api.getProject(id);
      setProject(data);
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadProject(); }, [loadProject]);

  if (loading || !project) {
    return <div className="p-4"><p className="text-gray-500">Loading project...</p></div>;
  }

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold">{project.name}</h1>
      <ProjectEditForm project={project} onSaved={loadProject} />

      <hr className="border-gray-200" />

      <StatusEntryForm
        initiativeId={project.id}
        projectName={project.name}
        onSubmitted={loadProject}
      />

      <h3 className="font-semibold text-gray-700">Status Updates</h3>
      <StatusUpdateList updates={project.statusUpdates} />
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add src/app/projects/ src/components/ProjectEditForm.tsx
git commit -m "feat: add project detail/edit view"
```

---

## Task 8: New Project Form + Projects List (Frontend — `frontend` branch)

**Goal:** Build the new project creation form and projects list page.

**Files:**
- Create: `src/app/new/page.tsx` (replace placeholder)
- Create: `src/app/projects/page.tsx` (replace placeholder)

**Step 1: Replace new project page**

Replace `src/app/new/page.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { LookupItem, StageName } from "@/lib/types";

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [benefit, setBenefit] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState("");
  const [stage, setStage] = useState<StageName>("Idea");
  const [tags, setTags] = useState<string[]>([]);
  const [stages, setStages] = useState<LookupItem[]>([]);
  const [allTags, setAllTags] = useState<LookupItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.listStages().then(setStages);
    api.listTags().then(setAllTags);
  }, []);

  function toggleTag(tagName: string) {
    setTags((prev) =>
      prev.includes(tagName) ? prev.filter((t) => t !== tagName) : [...prev, tagName]
    );
  }

  async function handleCreate() {
    if (!name.trim()) { setError("Name is required"); return; }
    setSubmitting(true);
    setError("");
    try {
      await api.createProject({ name, description, benefit, startDate, endDate, stage, tags });
      router.push("/projects");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">New Project</h1>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
        <input value={name} onChange={(e) => setName(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)}
          rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Benefit</label>
        <textarea value={benefit} onChange={(e) => setBenefit(e.target.value)}
          rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
        <select value={stage} onChange={(e) => setStage(e.target.value as StageName)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
          {stages.map((s) => (
            <option key={s.id} value={s.name}>{s.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
        <div className="flex flex-wrap gap-2">
          {allTags.map((t) => (
            <button key={t.id} onClick={() => toggleTag(t.name)}
              className={`px-3 py-1 rounded-full text-sm border ${
                tags.includes(t.name)
                  ? "bg-blue-100 border-blue-400 text-blue-800"
                  : "bg-gray-50 border-gray-200 text-gray-600"
              }`}>
              {t.name}
            </button>
          ))}
        </div>
      </div>

      <button onClick={handleCreate} disabled={submitting}
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold disabled:opacity-50">
        {submitting ? "Creating..." : "Create Project"}
      </button>

      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
}
```

**Step 2: Replace projects list page**

Replace `src/app/projects/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Project } from "@/lib/types";
import Link from "next/link";

const stageBadgeColors: Record<string, string> = {
  Active: "bg-green-100 text-green-800",
  Planned: "bg-blue-100 text-blue-800",
  Idea: "bg-yellow-100 text-yellow-800",
  Complete: "bg-gray-100 text-gray-800",
  Blocked: "bg-red-100 text-red-800",
  Incomplete: "bg-orange-100 text-orange-800",
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Omit<Project, "statusUpdates">[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listProjects().then(setProjects).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-4"><p className="text-gray-500">Loading projects...</p></div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">All Projects</h1>
      <div className="space-y-2">
        {projects.map((p) => (
          <Link key={p.id} href={`/projects/${p.id}`} className="block">
            <div className="bg-white rounded-lg border border-gray-200 p-3 flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{p.name}</p>
                <p className="text-xs text-gray-500">{p.startDate} — {p.endDate}</p>
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ml-2 whitespace-nowrap ${stageBadgeColors[p.stage] || "bg-gray-100"}`}>
                {p.stage}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add src/app/new/ src/app/projects/page.tsx
git commit -m "feat: add new project form and projects list page"
```

---

## Task 9: Playwright Setup + Fixtures (QA — `qa` branch)

**Goal:** Install Playwright, create test fixtures, set up auth bypass and route interception helpers.

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/fixtures/projects.json`
- Create: `e2e/fixtures/status-updates.json`
- Create: `e2e/fixtures/stages.json`
- Create: `e2e/fixtures/tags.json`
- Create: `e2e/fixtures/statuses.json`
- Create: `e2e/helpers/mock-api.ts`
- Create: `e2e/helpers/auth.ts`

**Step 1: Install Playwright**

```bash
npm install -D @playwright/test
npx playwright install chromium
```

**Step 2: Create Playwright config**

Create `playwright.config.ts`:

```typescript
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    viewport: { width: 390, height: 844 }, // iPhone 14 size (mobile-first)
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
```

**Step 3: Create fixtures**

Create `e2e/fixtures/projects.json`:

```json
[
  {
    "id": "i-active-1",
    "name": "Build Mobile App",
    "description": "Create a mobile-first project manager webapp",
    "benefit": "Access project data without Coda crashing",
    "startDate": "2026-02-01",
    "endDate": "2026-02-28",
    "stage": "Active",
    "tags": ["Personal"],
    "recentStatus": "On track"
  },
  {
    "id": "i-planned-1",
    "name": "Learn Rust",
    "description": "Work through the Rust book",
    "benefit": "Expand programming skills",
    "startDate": "2026-03-01",
    "endDate": "2026-04-30",
    "stage": "Planned",
    "tags": ["Fun", "Personal"],
    "recentStatus": null
  },
  {
    "id": "i-complete-1",
    "name": "Tax Prep 2025",
    "description": "Gather documents and file taxes",
    "benefit": "Legal compliance and potential refund",
    "startDate": "2026-01-15",
    "endDate": "2026-01-31",
    "stage": "Complete",
    "tags": ["Life360"],
    "recentStatus": "On track"
  },
  {
    "id": "i-idea-1",
    "name": "Garden Redesign",
    "description": "Plan and execute backyard garden renovation",
    "benefit": "Better outdoor space",
    "startDate": "2026-05-01",
    "endDate": "2026-06-15",
    "stage": "Idea",
    "tags": ["Physical", "Fun"],
    "recentStatus": null
  }
]
```

Create `e2e/fixtures/status-updates.json`:

```json
[
  {
    "id": "i-su-1",
    "date": "2026-02-06",
    "status": "On track",
    "update": "Set up the Next.js project scaffold",
    "initiativeId": "Build Mobile App"
  },
  {
    "id": "i-su-2",
    "date": "2026-02-05",
    "status": "On track",
    "update": "Finished the design doc and brainstorming",
    "initiativeId": "Build Mobile App"
  },
  {
    "id": "i-su-3",
    "date": "2026-02-04",
    "status": "At risk",
    "update": "Spent most of the day on other things",
    "initiativeId": "Build Mobile App"
  }
]
```

Create `e2e/fixtures/stages.json`:

```json
[
  { "id": "i-FC1bT1xy1i", "name": "Incomplete" },
  { "id": "i-Q8rfMkM8nT", "name": "Idea" },
  { "id": "i-SfYKs-eNGI", "name": "Planned" },
  { "id": "i-HWrLNgQ4jB", "name": "Active" },
  { "id": "i-4zWq2JLgo2", "name": "Complete" },
  { "id": "i-quU2JjOP_C", "name": "Blocked" }
]
```

Create `e2e/fixtures/tags.json`:

```json
[
  { "id": "i-410usZvjCp", "name": "Physical" },
  { "id": "i-jUe4HqvAke", "name": "Fun" },
  { "id": "i-ZQuQAAIJZE", "name": "Life360" },
  { "id": "i-D9be8Svlkc", "name": "Personal" }
]
```

Create `e2e/fixtures/statuses.json`:

```json
[
  { "id": "i-uMgAiX6mHg", "name": "On track" },
  { "id": "i-f5HM5p750g", "name": "At risk" },
  { "id": "i-a1HF1e9Tke", "name": "Off track" }
]
```

**Step 4: Create test helpers**

Create `e2e/helpers/mock-api.ts`:

```typescript
import { Page } from "@playwright/test";
import projects from "../fixtures/projects.json";
import statusUpdates from "../fixtures/status-updates.json";
import stages from "../fixtures/stages.json";
import tags from "../fixtures/tags.json";
import statuses from "../fixtures/statuses.json";

export async function mockAllRoutes(page: Page) {
  await page.route("/api/projects/active", (route) => {
    const active = projects.filter((p) => p.stage === "Active");
    route.fulfill({
      json: {
        project: active.length >= 1 ? { ...active[0], statusUpdates: [] } : null,
        errors: active.length === 0
          ? [{ type: "no_active", message: "No active projects found" }]
          : active.length > 1
          ? [{ type: "multiple_active", message: `${active.length} active projects found`, projects: active.map((p) => ({ id: p.id, name: p.name })) }]
          : [],
      },
    });
  });

  await page.route("/api/projects/*", (route) => {
    const url = route.request().url();
    const id = url.split("/api/projects/")[1];
    if (route.request().method() === "PATCH") {
      return route.fulfill({ json: { success: true } });
    }
    const project = projects.find((p) => p.id === id);
    if (project) {
      const updates = statusUpdates.filter((u) => u.initiativeId === project.name);
      return route.fulfill({ json: { ...project, statusUpdates: updates } });
    }
    return route.fulfill({ status: 404, json: { error: "Not found" } });
  });

  await page.route("/api/projects", (route) => {
    if (route.request().method() === "POST") {
      return route.fulfill({ status: 201, json: { id: "i-new-1" } });
    }
    return route.fulfill({ json: projects });
  });

  await page.route("/api/status-updates", (route) => {
    return route.fulfill({ status: 201, json: { success: true } });
  });

  await page.route("/api/stages", (route) => route.fulfill({ json: stages }));
  await page.route("/api/tags", (route) => route.fulfill({ json: tags }));
  await page.route("/api/statuses", (route) => route.fulfill({ json: statuses }));
}

export async function mockNoActiveProjects(page: Page) {
  await page.route("/api/projects/active", (route) => {
    route.fulfill({
      json: {
        project: null,
        errors: [{ type: "no_active", message: "No active projects found" }],
      },
    });
  });
}

export async function mockMultipleActiveProjects(page: Page) {
  await page.route("/api/projects/active", (route) => {
    route.fulfill({
      json: {
        project: projects[0],
        errors: [{
          type: "multiple_active",
          message: "2 active projects found",
          projects: [
            { id: "i-active-1", name: "Build Mobile App" },
            { id: "i-active-2", name: "Another Active" },
          ],
        }],
      },
    });
  });
}
```

Create `e2e/helpers/auth.ts`:

```typescript
import { BrowserContext } from "@playwright/test";

export async function bypassAuth(context: BrowserContext) {
  // Set a session cookie that the middleware will accept.
  // In tests, the middleware is bypassed by the mock routes anyway,
  // but this prevents redirects to /login.
  await context.addCookies([
    {
      name: "pm-session",
      value: "test-session-token",
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);
}
```

**Step 5: Commit**

```bash
git add playwright.config.ts e2e/
git commit -m "feat: add Playwright setup with fixtures and test helpers"
```

---

## Task 10: E2E Tests — Home View (QA — `qa` branch)

**Goal:** Test the home/active project view including error states.

**Files:**
- Create: `e2e/home.spec.ts`

**Step 1: Write home view tests**

Create `e2e/home.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";
import { mockAllRoutes, mockNoActiveProjects, mockMultipleActiveProjects } from "./helpers/mock-api";
import { bypassAuth } from "./helpers/auth";

test.beforeEach(async ({ context }) => {
  await bypassAuth(context);
});

test.describe("Home - Active Project", () => {
  test("shows active project card", async ({ page }) => {
    await mockAllRoutes(page);
    await page.goto("/");
    await expect(page.getByText("Build Mobile App")).toBeVisible();
    await expect(page.getByText("Active")).toBeVisible();
  });

  test("shows status entry form with yesterday as default date", async ({ page }) => {
    await mockAllRoutes(page);
    await page.goto("/");
    await expect(page.getByText("Log Status Update")).toBeVisible();

    const dateInput = page.locator('input[type="date"]');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const expected = yesterday.toISOString().split("T")[0];
    await expect(dateInput).toHaveValue(expected);
  });

  test("shows recent status updates", async ({ page }) => {
    await mockAllRoutes(page);
    await page.goto("/");
    await expect(page.getByText("Set up the Next.js project scaffold")).toBeVisible();
  });
});

test.describe("Home - Error States", () => {
  test("shows warning when no active projects", async ({ page }) => {
    await mockAllRoutes(page);
    await mockNoActiveProjects(page);
    await page.goto("/");
    await expect(page.getByText("No active projects found")).toBeVisible();
    await expect(page.getByText("Create New Project")).toBeVisible();
  });

  test("shows warning when multiple active projects", async ({ page }) => {
    await mockAllRoutes(page);
    await mockMultipleActiveProjects(page);
    await page.goto("/");
    await expect(page.getByText("2 active projects found")).toBeVisible();
  });
});
```

**Step 2: Run tests**

```bash
npx playwright test e2e/home.spec.ts
```

**Step 3: Commit**

```bash
git add e2e/home.spec.ts
git commit -m "test: add home view E2E tests"
```

---

## Task 11: E2E Tests — Timeline + Projects List (QA — `qa` branch)

**Files:**
- Create: `e2e/timeline.spec.ts`
- Create: `e2e/projects.spec.ts`

**Step 1: Write tests**

Create `e2e/timeline.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";
import { mockAllRoutes } from "./helpers/mock-api";
import { bypassAuth } from "./helpers/auth";

test.beforeEach(async ({ context }) => {
  await bypassAuth(context);
});

test.describe("Timeline", () => {
  test("renders gantt chart with projects", async ({ page }) => {
    await mockAllRoutes(page);
    await page.goto("/timeline");
    await expect(page.getByText("Timeline")).toBeVisible();
    // frappe-gantt renders SVG bars — check that it loaded
    await expect(page.locator(".gantt")).toBeVisible({ timeout: 10000 });
  });

  test("clicking a project bar navigates to detail", async ({ page }) => {
    await mockAllRoutes(page);
    await page.goto("/timeline");
    await page.locator(".gantt .bar-wrapper").first().click();
    await expect(page).toHaveURL(/\/projects\//);
  });
});
```

Create `e2e/projects.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";
import { mockAllRoutes } from "./helpers/mock-api";
import { bypassAuth } from "./helpers/auth";

test.beforeEach(async ({ context }) => {
  await bypassAuth(context);
});

test.describe("Projects List", () => {
  test("shows all projects", async ({ page }) => {
    await mockAllRoutes(page);
    await page.goto("/projects");
    await expect(page.getByText("Build Mobile App")).toBeVisible();
    await expect(page.getByText("Learn Rust")).toBeVisible();
    await expect(page.getByText("Tax Prep 2025")).toBeVisible();
    await expect(page.getByText("Garden Redesign")).toBeVisible();
  });

  test("clicking a project navigates to detail", async ({ page }) => {
    await mockAllRoutes(page);
    await page.goto("/projects");
    await page.getByText("Build Mobile App").click();
    await expect(page).toHaveURL(/\/projects\/i-active-1/);
  });
});
```

**Step 2: Run tests**

```bash
npx playwright test e2e/timeline.spec.ts e2e/projects.spec.ts
```

**Step 3: Commit**

```bash
git add e2e/timeline.spec.ts e2e/projects.spec.ts
git commit -m "test: add timeline and projects list E2E tests"
```

---

## Task 12: E2E Tests — Project Detail + New Project (QA — `qa` branch)

**Files:**
- Create: `e2e/project-detail.spec.ts`
- Create: `e2e/new-project.spec.ts`

**Step 1: Write tests**

Create `e2e/project-detail.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";
import { mockAllRoutes } from "./helpers/mock-api";
import { bypassAuth } from "./helpers/auth";

test.beforeEach(async ({ context }) => {
  await bypassAuth(context);
});

test.describe("Project Detail", () => {
  test("displays project fields", async ({ page }) => {
    await mockAllRoutes(page);
    await page.goto("/projects/i-active-1");
    await expect(page.getByText("Build Mobile App")).toBeVisible();
    await expect(page.locator('input[type="date"]').first()).toHaveValue("2026-02-01");
  });

  test("can edit and save project", async ({ page }) => {
    await mockAllRoutes(page);
    await page.goto("/projects/i-active-1");

    // Change the name
    const nameInput = page.locator("input").first();
    await nameInput.clear();
    await nameInput.fill("Updated Project Name");

    await page.getByText("Save Changes").click();
    // Should not show error — save was mocked as successful
    await expect(page.getByText("Save Changes")).toBeVisible();
  });

  test("shows status updates for the project", async ({ page }) => {
    await mockAllRoutes(page);
    await page.goto("/projects/i-active-1");
    await expect(page.getByText("Set up the Next.js project scaffold")).toBeVisible();
  });
});
```

Create `e2e/new-project.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";
import { mockAllRoutes } from "./helpers/mock-api";
import { bypassAuth } from "./helpers/auth";

test.beforeEach(async ({ context }) => {
  await bypassAuth(context);
});

test.describe("New Project", () => {
  test("shows form with required fields", async ({ page }) => {
    await mockAllRoutes(page);
    await page.goto("/new");
    await expect(page.getByText("New Project")).toBeVisible();
    await expect(page.getByText("Name *")).toBeVisible();
    await expect(page.getByText("Create Project")).toBeVisible();
  });

  test("validates name is required", async ({ page }) => {
    await mockAllRoutes(page);
    await page.goto("/new");
    await page.getByText("Create Project").click();
    await expect(page.getByText("Name is required")).toBeVisible();
  });

  test("can create a project and navigate to list", async ({ page }) => {
    await mockAllRoutes(page);
    await page.goto("/new");

    await page.locator("input").first().fill("Test New Project");
    await page.getByText("Create Project").click();

    await expect(page).toHaveURL("/projects");
  });
});
```

**Step 2: Run all tests**

```bash
npx playwright test
```

**Step 3: Commit**

```bash
git add e2e/project-detail.spec.ts e2e/new-project.spec.ts
git commit -m "test: add project detail and new project E2E tests"
```

---

## Summary: Task Assignment

| Task | Agent | Branch | Dependencies |
|---|---|---|---|
| 0: Scaffold | Lead | `main` | None |
| 1: Coda client | Backend | `backend` | Task 0 |
| 2: API routes | Backend | `backend` | Task 1 |
| 3: Auth backend | Backend | `backend` | Task 0 |
| 4: Auth pages | Backend | `backend` | Task 3 |
| 5: Home view | Frontend | `frontend` | Task 0 |
| 6: Timeline view | Frontend | `frontend` | Task 0 |
| 7: Project detail | Frontend | `frontend` | Task 0 |
| 8: New project + list | Frontend | `frontend` | Task 0 |
| 9: Playwright setup | QA | `qa` | Task 0 |
| 10: Home tests | QA | `qa` | Task 9 |
| 11: Timeline + list tests | QA | `qa` | Task 9 |
| 12: Detail + new tests | QA | `qa` | Task 9 |

**Parallelism:** After Task 0, Backend (1-4), Frontend (5-8), and QA (9-12) can all work in parallel.
