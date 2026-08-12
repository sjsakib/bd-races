import { expect, test } from "@playwright/test";

test.describe("race discovery", () => {
  test("renders upcoming events without fetching JSON", async ({ page }) => {
    const jsonRequests: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("events.json")) {
        jsonRequests.push(request.url());
      }
    });

    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Upcoming races" })).toBeVisible();
    await expect(page.locator(".event-card").first()).toBeVisible();
    await expect(page.locator("#result-count")).toContainText("upcoming races");
    expect(jsonRequests).toEqual([]);
  });

  test("filters via search and updates the URL", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Search events").fill("Dhaka");
    await expect(page).toHaveURL(/q=Dhaka/);
    await expect(page.locator(".event-card").first()).toBeVisible();
  });

  test("restores filters from the query string", async ({ page }, testInfo) => {
    await page.goto("/?location=Dhaka&sort=popular");
    if (testInfo.project.name === "mobile") {
      await page.getByRole("button", { name: /^Filters/ }).click();
    }
    await expect(page.getByLabel("Location")).toHaveValue("Dhaka");
    await expect(page.getByLabel("Sort events")).toHaveValue("popular");
  });

  test("shows an empty state that can clear filters", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Search events").fill("zzznomatchzzz");
    await expect(page.getByRole("heading", { name: "No races match these filters" })).toBeVisible();
    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(page.locator(".event-card").first()).toBeVisible();
  });

  test("opens the mobile filter sheet", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "mobile project only");
    await page.goto("/");
    await page.getByRole("button", { name: /^Filters/ }).click();
    await expect(page.locator("#filter-panel")).toHaveClass(/is-open/);
    await page.keyboard.press("Escape");
    await expect(page.locator("#filter-panel")).not.toHaveClass(/is-open/);
  });

  test("copies the visible event list", async ({ page, context }, testInfo) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/");
    if (testInfo.project.name === "mobile") {
      await page.getByRole("button", { name: /^Filters/ }).click();
    }
    await page.getByRole("button", { name: "Copy list" }).click();
    await expect(page.getByRole("button", { name: "Copied" })).toBeVisible();
    const text = await page.evaluate(() => navigator.clipboard.readText());
    expect(text).toContain("Running Events in Bangladesh");
  });
});
