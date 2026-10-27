#!/usr/bin/env node
// Captures README screenshots from a running server (default http://localhost:3100).
// Usage: node scripts/capture-screenshots.mjs [baseUrl]
import { chromium } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:3100";
const out = (n) => `docs/images/${n}.jpg`;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 2, reducedMotion: "reduce" });
const page = await ctx.newPage();
const shot = (name, opts = {}) => page.screenshot({ path: out(name), type: "jpeg", quality: 82, ...opts });
const scrollTo = async (locator, offset = -90) => {
  await locator.first().evaluate((el) => el.scrollIntoView({ block: "start" }));
  await page.evaluate((o) => window.scrollBy(0, o), offset);
  await page.waitForTimeout(400);
};

await page.goto(`${base}/login`);
await page.waitForLoadState("networkidle");
await shot("login");

await page.goto(base);
await page.waitForLoadState("networkidle");
await shot("landing");
await scrollTo(page.locator("#advisor"), 0);
// Step the walkthrough to its last step for a complete picture.
for (let i = 0; i < 6; i++) await page.getByRole("button", { name: "Next step" }).click();
await shot("landing-agent");

await page.getByRole("button", { name: /Open the sample shelf/ }).click();
await page.waitForURL(/\/app/);
await page.waitForLoadState("networkidle");
await shot("shelf");
await scrollTo(page.getByText("Collection score").first(), -120);
await shot("score");

await page.goto(`${base}/app/today`);
await page.getByRole("radio", { name: "Evening & date" }).click();
await page.getByRole("radio", { name: "Cold" }).click();
await page.waitForTimeout(1500);
await page.getByText("Today's pick", { exact: true }).waitFor({ timeout: 90000 });
await shot("today");

await page.goto(`${base}/app/lab`);
await page.getByLabel("Bottle A").selectOption({ label: "Tom Ford Tobacco Vanille" });
await page.getByLabel("Bottle B").selectOption({ label: "Maison Martin Margiela Jazz Club" });
await page.getByText(/^Predicted:/).waitFor({ timeout: 60000 });
await page.waitForTimeout(500);
await shot("lab");

await page.goto(`${base}/app/score`);
await page.getByLabel(/A bottle you.re considering/).fill("aromatics elixir");
await page.getByRole("button", { name: /Aromatics Elixir/ }).first().click();
await page.getByText("With it").waitFor();
await page.waitForTimeout(400);
await shot("simulator");

await page.goto(`${base}/app/discover?mode=gaps`);
await page.getByText("estimated fit").first().waitFor({ timeout: 30000 });
await page.getByRole("button", { name: /Why this rank/ }).first().click();
await shot("discover");

const first = page.getByRole("listitem").filter({ has: page.getByText("estimated fit") }).first();
await first.getByRole("heading").getByRole("link").click();
await page.getByRole("heading", { name: "Compare prices" }).waitFor();
await shot("detail");
// Price check on a bottle from the sample shelf (Bleu de Chanel EDP 100 ml), where live results
// include trust flags and hidden listings.
await page.goto(`${base}/app`);
await page.goto(base + (await page.locator('a[href*="/app/fragrance/"]').first().getAttribute("href")));
await page.getByRole("button", { name: "Compare prices" }).click();
await page.getByText(/Exact matches/).waitFor({ timeout: 60000 });
await scrollTo(page.getByText(/Sample offers, not live prices|Offers found from available sources/), -160);
await shot("offers");

await page.goto(`${base}/app/advisor`);
await page.getByRole("button", { name: /woody winter fragrance/ }).click();
await page.getByRole("button", { name: /How I got this/ }).waitFor({ timeout: 60000 });
await page.getByRole("button", { name: /How I got this/ }).click();
await shot("advisor");

await page.goto(`${base}/evals`);
await page.waitForLoadState("networkidle");
await shot("evals");

await page.goto(`${base}/how-it-works#advisor`);
await page.waitForTimeout(600);
await shot("how-agent");

const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
const p2 = await phone.newPage();
await p2.goto(base);
await p2.getByRole("button", { name: /Open a sample shelf/ }).click();
await p2.waitForURL(/\/app/);
await p2.waitForLoadState("networkidle");
await p2.screenshot({ path: out("phone"), type: "jpeg", quality: 82 });
await p2.goto(`${base}/app/today`);
await p2.getByText("Today's pick", { exact: true }).waitFor({ timeout: 90000 });
await p2.screenshot({ path: out("phone-today"), type: "jpeg", quality: 82 });

await browser.close();
console.log("Saved screenshots to docs/images/");
