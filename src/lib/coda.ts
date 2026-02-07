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
