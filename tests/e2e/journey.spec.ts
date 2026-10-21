import { createClient } from "@supabase/supabase-js";
import { expect, test } from "./fixtures";
import { addFromSearch, signUp } from "./helpers";

test.describe.configure({ timeout: 120_000 });

test("E2E-02: new account adds five, dislikes oud, gets Different picks it doesn't own, wishlist persists", async ({ page }) => {
  await signUp(page, "journey");
  await page.waitForURL(/\/app\/add/);

  // COL-01: five distinct additions with live progress toward five.
  const picks: [string, RegExp][] = [
    ["dior sauvage", /Dior Sauvage ·/],
    ["bleu de chanel", /Chanel Bleu de Chanel ·/],
    ["acqua di gio", /Giorgio Armani Acqua di Gio ·/],
    ["versace eros", /Versace Eros ·/],
    ["light blue", /Dolce&Gabbana Light Blue ·/],
  ];
  for (const [q, re] of picks) await addFromSearch(page, q, re);
  await expect(page.getByText("Profile ready")).toBeVisible();

  // Dashboard count matches (DASH-01).
  await page.goto("/app");
  await expect(page.getByText("Bottles", { exact: true }).locator("..")).toContainText("5");

  // PRO-01: preferences persist and are used.
  await page.goto("/app/preferences");
  await page.getByLabel("Notes to avoid", { exact: true }).fill("oud");
  await page.getByLabel("Notes to avoid", { exact: true }).press("Enter");
  await page.getByRole("button", { name: "Save preferences" }).click();
  await expect(page.getByText("All changes saved")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("list", { name: "Notes to avoid selected" })).toContainText("oud");

  // REC-04/05 end to end: Different mode, nothing owned, nothing with oud.
  await page.goto("/app/discover?mode=different");
  await page.getByRole("button", { name: "Show suggestions" }).click();
  const cards = page.getByRole("listitem").filter({ has: page.getByText("estimated fit") });
  await expect(cards.first()).toBeVisible({ timeout: 20_000 });
  const names = await cards.getByRole("heading").allInnerTexts();
  for (const owned of ["Sauvage", "Bleu de Chanel", "Acqua di Gio", "Eros", "Light Blue"]) expect(names).not.toContain(owned);
  await expect(page.getByText(/with notes you avoid/)).toBeVisible();

  // Verify against the database that no recommended fragrance contains oud.
  const ids = await cards.getByRole("heading").getByRole("link").evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).href.split("/").pop()!));
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data } = await db.from("fragrances").select("name, notes, accords").in("id", ids);
  for (const f of data ?? []) {
    const text = JSON.stringify(f.notes).toLowerCase();
    expect(text, `${f.name} contains oud`).not.toMatch(/oud|agarwood/);
  }

  // WISH-01: save, reload, still there; then convert to owned.
  const firstName = names[0];
  await cards.first().getByRole("button", { name: "Save" }).click();
  await expect(cards.first().getByRole("button", { name: "On wishlist" })).toBeVisible();
  await page.goto("/app/wishlist");
  await page.reload();
  await expect(page.getByRole("heading", { name: firstName })).toBeVisible();
  await page.getByRole("button", { name: "I bought it" }).click();
  await expect(page.getByText("Nothing saved yet")).toBeVisible();
  await page.goto("/app/collection");
  await expect(page.getByText("Showing 6 of 6")).toBeVisible();
});

test("FDBK-01: relevance feedback is recorded", async ({ page }) => {
  await signUp(page, "feedback");
  await page.waitForURL(/\/app\/add/);
  await addFromSearch(page, "tobacco vanille", /Tom Ford Tobacco Vanille/);
  await page.goto("/app/discover");
  await page.getByRole("button", { name: "Show suggestions" }).click();
  const card = page.getByRole("listitem").filter({ has: page.getByText("estimated fit") }).first();
  await expect(card).toBeVisible({ timeout: 20_000 });
  await card.getByRole("button", { name: "Relevant", exact: true }).click();
  await expect(card.getByText("Thanks")).toBeVisible();
});
