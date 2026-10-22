import { expect, test } from "./fixtures";
import { startDemo } from "./helpers";

test.describe.configure({ timeout: 120_000 });

test("CS-07 / CS-05: demo shows a Collection Score and previews a new bottle without adding it", async ({ page }) => {
  await startDemo(page);
  await expect(page.getByText("Collection score").first()).toBeVisible();
  await expect(page.getByText(/confidence/).first()).toBeVisible();
  await page.goto("/app/score");
  await page.getByLabel(/A bottle you.re considering/).fill("aromatics elixir");
  await page.getByRole("button", { name: /Aromatics Elixir/ }).first().click();
  const preview = page.getByRole("region", { name: /Score preview for Clinique Aromatics Elixir/ });
  await expect(preview).toBeVisible({ timeout: 20_000 });
  await expect(preview.getByText("With it")).toBeVisible();
  await expect(preview.getByRole("table")).toContainText("Season coverage");
  // Read-only: the collection is unchanged.
  await page.goto("/app/collection");
  await expect(page.getByText("Showing 6 of 6")).toBeVisible();
  // An owned bottle previews as a duplicate, with no false improvement (CS-04).
  await page.goto("/app/score");
  await page.getByLabel(/A bottle you.re considering/).fill("tobacco vanille");
  await page.getByRole("button", { name: /Tom Ford.*Tobacco Vanille/ }).first().click();
  await expect(page.getByText(/You already own this fragrance/)).toBeVisible({ timeout: 20_000 });
});

test("DS-01..05: Today picks from owned bottles, re-ranks without reload, and logs a wear", async ({ page }) => {
  await startDemo(page);
  await page.goto("/app/today");
  const pick = page.getByRole("heading", { level: 2 });
  await expect(page.getByText("Today's pick")).toBeVisible({ timeout: 20_000 });
  const owned = ["Bleu de Chanel Eau de Parfum", "Tobacco Vanille", "Sauvage", "Jazz Club", "Wood Sage & Sea Salt", "Acqua di Gio"];
  expect(owned).toContain((await pick.innerText()).trim());
  await page.getByRole("radio", { name: "Evening & date" }).click();
  await page.getByRole("radio", { name: "Cold" }).click();
  await expect(pick).toHaveText(/Tobacco Vanille|Jazz Club/, { timeout: 20_000 });
  await page.getByRole("button", { name: "Wore this" }).first().click();
  await expect(page.getByText("Logged as worn today")).toBeVisible();
  // Avoid list (DS-01): excluding the pick changes it.
  const name = (await pick.innerText()).trim();
  await page.getByRole("button", { name, exact: true }).click();
  await expect(pick).not.toHaveText(name, { timeout: 20_000 });
});

test("SL-01..05: Scent Lab shows sample experiments, predicts a pair, saves it and logs a wear", async ({ page }) => {
  await startDemo(page);
  await page.goto("/app/lab");
  await expect(page.getByText("2 saved")).toBeVisible();
  await expect(page.getByText(/Sample entry: warm and boozy/)).toBeVisible();
  await page.getByLabel("Bottle A").selectOption({ label: "Dior Sauvage" });
  // The same bottle can't be chosen twice (SL-01).
  await expect(page.getByLabel("Bottle B").locator("option", { hasText: "Dior Sauvage" })).toBeDisabled();
  await page.getByLabel("Bottle B").selectOption({ label: "Maison Martin Margiela Jazz Club" });
  await expect(page.getByText(/^Predicted:/)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("not an optimal ratio", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Save to lab notebook" }).click();
  await expect(page.getByText("3 saved")).toBeVisible({ timeout: 20_000 });
  const row = page.getByRole("listitem").filter({ hasText: "Sauvage + Jazz Club" });
  await row.getByRole("button", { name: "Log a wear" }).click();
  await row.getByRole("radio", { name: "5 of 5" }).click();
  await row.getByRole("button", { name: "Log this wear" }).click();
  await expect(row.getByText("5.0 / 5")).toBeVisible({ timeout: 20_000 });
  await page.reload();
  await expect(page.getByRole("listitem").filter({ hasText: "Sauvage + Jazz Club" }).getByText("5.0 / 5")).toBeVisible();
});
