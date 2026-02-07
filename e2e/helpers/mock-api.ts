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
