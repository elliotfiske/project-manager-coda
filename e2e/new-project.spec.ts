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
