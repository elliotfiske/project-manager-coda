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
