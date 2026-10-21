#!/usr/bin/env node
// Captures README screenshots from a running dev server (default http://localhost:3100).
// Usage: node scripts/capture-screenshots.mjs [baseUrl]
import { chromium } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:3100";
const out = (n) => `docs/images/${n}.jpg`;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const shot = (name, opts = {}) => page.screenshot({ path: out(name), type: "jpeg", quality: 82, ...opts });

await page.goto(base);
await page.waitForLoadState("networkidle");
await shot("landing");

await page.getByRole("button", { name: /Try the live demo/ }).click();
await page.waitForURL(/\/app/);
await page.waitForLoadState("networkidle");
await shot("dashboard", { fullPage: true });

await page.goto(`${base}/app/discover?mode=gaps`);
await page.getByRole("button", { name: "Show suggestions" }).click();
await page.getByText("estimated fit").first().waitFor({ timeout: 30000 });
await page.getByRole("button", { name: /Why this rank/ }).first().click();
await shot("discover");

const first = page.getByRole("listitem").filter({ has: page.getByText("estimated fit") }).first();
await first.getByRole("heading").getByRole("link").click();
await page.getByRole("heading", { name: "Compare prices" }).waitFor();
await shot("detail", { fullPage: false });
await page.getByLabel("Concentration").selectOption("EDP");
await page.getByRole("button", { name: "Compare prices" }).click();
await page.getByText(/Exact matches/).waitFor();
await page.getByText(/Sample offers, not live prices|Offers found from available sources/).first().evaluate((el) => el.scrollIntoView({ block: "start" }));
await page.evaluate(() => window.scrollBy(0, -140));
await shot("offers");

await page.getByRole("button", { name: "Ask the advisor" }).click();
await page.getByRole("button", { name: /woody winter fragrance/ }).click();
await page.getByRole("button", { name: /How I got this/ }).waitFor({ timeout: 60000 });
await page.getByRole("button", { name: /How I got this/ }).click();
await shot("advisor");
await page.keyboard.press("Escape");

await page.goto(`${base}/evals`);
await page.waitForLoadState("networkidle");
await shot("evals");

const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
const p2 = await phone.newPage();
await p2.goto(base);
await p2.getByRole("button", { name: /Try the live demo/ }).click();
await p2.waitForURL(/\/app/);
await p2.waitForLoadState("networkidle");
await p2.screenshot({ path: out("phone"), type: "jpeg", quality: 82 });

await browser.close();
console.log("Saved screenshots to docs/images/");
