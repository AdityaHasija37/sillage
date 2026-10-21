import { expect, test } from "./fixtures";
import { startDemo } from "./helpers";

test.describe.configure({ timeout: 90_000 });

test("E2E-03 / ERR-01..03: catalog and advisor failures show honest errors and the app keeps working", async ({ page }) => {
  await startDemo(page);

  // Catalog search outage (simulated at the network layer).
  await page.route("**/api/catalog/search**", (route) => route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "Search is unavailable right now." }) }));
  await page.goto("/app/add");
  await page.getByLabel("Search by brand or name").fill("sauvage");
  await expect(page.getByText("Search is unavailable right now.")).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "I own this" })).toHaveCount(0); // nothing invented

  // Advisor outage.
  await page.route("**/api/chat", (route) => route.abort());
  await page.getByRole("button", { name: "Ask the advisor" }).click();
  await page.getByLabel("Ask the advisor").fill("anything new for summer?");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toBeVisible();
  await page.keyboard.press("Escape");

  // Collection, dashboard and detail still work.
  await page.goto("/app/collection");
  await expect(page.getByText("Showing 6 of 6")).toBeVisible();
  await page.goto("/app");
  await expect(page.getByRole("heading", { name: "What your shelf says" })).toBeVisible();
});

test("SEC-04: unknown or malicious fragrance ids 404 instead of erroring", async ({ page }) => {
  await startDemo(page);
  const res = await page.goto("/app/fragrance/not-a-uuid");
  expect(res?.status()).toBe(404);
  const api = await page.request.get("/api/fragrances/00000000-0000-4000-8000-000000000000");
  expect(api.status()).toBe(404);
});
