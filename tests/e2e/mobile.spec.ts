import { expect, test } from "./fixtures";
import { startDemo } from "./helpers";

test.describe.configure({ timeout: 90_000 });

test("Mobile: demo, bottom navigation and Discover work at phone width with no horizontal scroll", async ({ page }) => {
  await startDemo(page);
  const nav = page.getByRole("navigation", { name: "Main" }).last();
  await expect(nav).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await nav.getByRole("link", { name: "Discover" }).click();
  await page.getByRole("button", { name: "Show suggestions" }).click();
  await expect(page.getByText("estimated fit").first()).toBeVisible({ timeout: 20_000 });
  const overflow2 = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow2).toBeLessThanOrEqual(1);
});
