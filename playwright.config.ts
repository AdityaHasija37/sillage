import { defineConfig, devices } from "@playwright/test";

// Local Supabase URL/keys for test helpers (never committed).
try {
  process.loadEnvFile(".env.local");
} catch {}

const PORT = Number(process.env.PORT ?? 3100);
// BASE_URL=https://… runs the suite against a deployment (smoke test) instead of a local server.
const BASE_URL = process.env.BASE_URL;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 2,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL: BASE_URL ?? `http://localhost:${PORT}`, trace: "on-first-retry" },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] }, testMatch: /mobile\.spec\.ts/ },
  ],
  webServer: BASE_URL
    ? undefined
    : {
        command: `npm run dev -- --port ${PORT}`,
        url: `http://localhost:${PORT}`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
