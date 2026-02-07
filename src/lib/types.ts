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
