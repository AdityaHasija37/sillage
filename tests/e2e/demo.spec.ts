import { expect, test } from "./fixtures";
import { startDemo } from "./helpers";

test.describe.configure({ timeout: 90_000 });

test("E2E-01 / DEMO-01: guest demo → Fill gaps → grounded result → exact variant offers, no sign-up", async ({ page }) => {
  const started = Date.now();
  await startDemo(page);

  // Dashboard: real counts from the seeded sample shelf (DASH-01).
  await expect(page.getByRole("heading", { name: "What your shelf says" })).toBeVisible();
  await expect(page.getByText("Bottles", { exact: true }).locator("..")).toContainText("6");
  await expect(page.getByRole("heading", { name: "Scent mix" })).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible(); // season × time-of-day grid

  // Discover → Fill gaps (REC, FR-06).
  await page.getByRole("link", { name: /Find my next fragrance/ }).click();
  await page.getByRole("radio", { name: /Fill gaps/ }).click();
  await page.getByRole("button", { name: "Show suggestions" }).click();
  const first = page.getByRole("listitem").filter({ has: page.getByText("estimated fit") }).first();
  await expect(first).toBeVisible({ timeout: 20_000 });
  await expect(first).toContainText("✓"); // at least one reason
  await expect(page.getByText(/Ranked by Sillage's deterministic engine/)).toBeVisible();
  await expect(page.getByText(/with notes you avoid/)).toBeVisible(); // demo dislikes oud

  // Open the top pick, choose an exact variant, compare (FR-08, FR-10).
  await first.getByRole("heading").getByRole("link").click();
  await expect(page.getByRole("heading", { name: "Compare prices" })).toBeVisible();
  await page.getByLabel("Concentration").selectOption("EDP");
  await page.getByLabel("Size").selectOption({ index: 0 });
  await page.getByRole("button", { name: "Compare prices" }).click();
  await expect(page.getByText(/Sample offers, not live prices/)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("heading", { name: /Exact matches/ })).toBeVisible();
  await expect(page.getByText(/Hidden because they aren't the same bottle/)).toBeVisible();
  await expect(page.getByText("Sample, no link").first()).toBeVisible();

  // The whole guided path is well under the two-minute target for an automated run (DEMO-01).
  expect(Date.now() - started).toBeLessThan(120_000);
});

test("FR-07: advisor answers from the user's collection, with a trace and grounded citations", async ({ page }) => {
  await startDemo(page);
  await page.getByRole("button", { name: "Ask the advisor" }).click();
  await page.getByRole("button", { name: /woody winter fragrance/ }).click();
  const trace = page.getByRole("button", { name: /How I got this/ });
  await expect(trace).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("list", { name: "Fragrances mentioned" })).toBeVisible();
  await trace.click();
  await expect(page.getByText(/Grounding check: \d+ fragrance/)).toBeVisible();
});

test("SEC-02: two demo visitors get separate sandboxes", async ({ browser }) => {
  const a = await browser.newContext();
  const b = await browser.newContext();
  const pa = await a.newPage();
  const pb = await b.newPage();
  await startDemo(pa);
  await startDemo(pb);
  // A removes a bottle; B's shelf is unaffected.
  await pa.goto("/app/collection");
  await pa.getByRole("button", { name: /Remove .* from collection/ }).first().click();
  await expect(pa.getByText("Showing 5 of 5")).toBeVisible();
  await pb.goto("/app/collection");
  await expect(pb.getByText("Showing 6 of 6")).toBeVisible();
  await a.close();
  await b.close();
});
