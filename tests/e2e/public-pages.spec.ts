import { expect, test } from "@playwright/test";

test("login page exposes the primary sign-in action", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("button", { name: /get started|continue with google/i })).toBeVisible();
});

test("learn-more page is responsive and branded", async ({ page }) => {
  await page.goto("/learn-more");
  await expect(page.getByText("Hospitality reinvented", { exact: false })).toBeVisible();
  await expect(page.locator("body")).not.toHaveCSS("overflow-x", "scroll");
});

test("legal pages are available", async ({ page }) => {
  for (const path of ["/terms", "/privacy"]) {
    await page.goto(path);
    await expect(page.locator("main, body")).toContainText(/Loji|Terms|Privacy/i);
  }
});
