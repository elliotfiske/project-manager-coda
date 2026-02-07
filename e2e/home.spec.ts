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
