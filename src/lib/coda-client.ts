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
