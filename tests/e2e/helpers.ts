import type { Page } from "@playwright/test";
import { expect } from "./fixtures";

/** One-click demo from the landing page (no email, no sign-up). */
export async function startDemo(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: /Try the live demo/ }).click();
  await page.waitForURL(/\/app\?welcome=demo/, { timeout: 30_000 });
  await expect(page.getByText("Sample collection.")).toBeVisible();
}

/** Fresh account through the real sign-up form (email confirmation is off locally). */
export async function signUp(page: Page, tag: string) {
  const email = `e2e-${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.test`;
  await page.goto("/register");
  await page.getByLabel(/name/i).fill("E2E Tester");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("correct-horse-battery");
  await page.getByRole("button", { name: /create account/i }).click();
  return email;
}

export async function addFromSearch(page: Page, query: string, pick: RegExp) {
  await page.getByLabel("Search by brand or name").fill(query);
  const row = page.getByRole("listitem").filter({ hasText: pick }).first();
  await expect(row).toBeVisible({ timeout: 15_000 });
  await row.getByRole("button", { name: /to my collection/ }).click();
  await expect(row.getByText("Owned")).toBeVisible();
}
