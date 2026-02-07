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
