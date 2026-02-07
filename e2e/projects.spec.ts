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
