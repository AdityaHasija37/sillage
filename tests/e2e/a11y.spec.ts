import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./fixtures";
import { startDemo } from "./helpers";

test.use({ viewport: { width: 1440, height: 1000 } });
test.describe.configure({ timeout: 180_000 });

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function audit(page: import("@playwright/test").Page, name: string) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(300);
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  const summary = serious.map((v) => `${v.id} (${v.impact}): ${v.help}\n    ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join("\n    ")}`);
  expect.soft(summary, `${name}\n${summary.join("\n")}`).toEqual([]);
}

test("No serious or critical WCAG 2.2 AA violations on key screens", async ({ page }) => {
  for (const path of ["/", "/how-it-works", "/evals", "/privacy", "/login", "/register"]) {
    await page.goto(path);
    await audit(page, path);
  }
  await startDemo(page);
  for (const path of ["/app", "/app/collection", "/app/add", "/app/wishlist", "/app/preferences"]) {
    await page.goto(path);
    await audit(page, path);
  }
  await page.goto("/app/discover?mode=gaps");
  await page.getByRole("button", { name: "Show suggestions" }).click();
  await page.getByText("estimated fit").first().waitFor({ timeout: 20_000 });
  await audit(page, "discover results");
  await page.getByRole("listitem").filter({ has: page.getByText("estimated fit") }).first().getByRole("heading").getByRole("link").click();
  await page.getByLabel("Concentration").selectOption("EDP");
  await page.getByRole("button", { name: "Compare prices" }).click();
  await page.getByText(/Sample offers, not live prices/).waitFor();
  await audit(page, "fragrance detail with offers");
  await page.getByRole("button", { name: "Ask the advisor" }).click();
  await audit(page, "advisor panel");
});

test("Keyboard-only: search → add → discover → shortlist (UX accessibility acceptance)", async ({ page }) => {
  await startDemo(page);
  await page.goto("/app/add");
  await page.keyboard.type("terre d'hermes");
  const add = page.getByRole("button", { name: /Add Hermès Terre d'Hermès to my collection/ }).first();
  await add.waitFor();
  await add.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Added. How do you feel about it?")).toBeVisible();
  await page.goto("/app/discover");
  await page.getByRole("button", { name: "Show suggestions" }).focus();
  await page.keyboard.press("Enter");
  const save = page.getByRole("button", { name: "Save" }).first();
  await save.waitFor({ timeout: 20_000 });
  await save.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "On wishlist" }).first()).toBeVisible();
});
