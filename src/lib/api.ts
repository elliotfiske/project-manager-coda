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
