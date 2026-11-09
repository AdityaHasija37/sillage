#!/usr/bin/env node
// Prints the most-requested missing fragrances (DEC-58). Uses the service role, so run it only on a
// trusted machine; the output is what users typed, so it is never printed by the public CI job.
// Usage: node scripts/catalog-requests.mjs [--env .env.local] [--limit 25]

import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
try {
  process.loadEnvFile(path.join(root, arg("env", ".env.local")));
} catch {}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");

const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const { data, error } = await db.rpc("top_fragrance_requests", { p_limit: Number(arg("limit", "25")) });
if (error) throw new Error(error.message);
if (!data.length) console.log("No requests yet.");
else
  console.table(
    data.map((r) => ({ request: r.example, people: Number(r.requests), last: r.last_requested.slice(0, 10), "a catalog name contains it now": r.now_in_catalog ? "yes" : "no" })),
  );
