#!/usr/bin/env node
// Upserts .data/catalog.jsonl (from build-catalog.mjs) into the fragrances table.
// Idempotent: keyed on (provider, external_id). Uses the service role, so run it only from a
// trusted machine. Usage: node scripts/load-catalog.mjs [--env .env.local] [--limit N]

import { createReadStream, existsSync } from "node:fs";
import { createInterface } from "node:readline";
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
const file = path.join(root, ".data", "catalog.jsonl");
if (!existsSync(file)) throw new Error("Run `npm run catalog:build` first");

const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const limit = Number(arg("limit", "Infinity"));
const BATCH = 400;

const toRow = (r) => ({
  provider: r.provider,
  external_id: r.externalId,
  brand: r.brand.slice(0, 120),
  name: r.name.slice(0, 200),
  canonical_key: r.canonicalKey,
  year: r.year && r.year >= 1700 && r.year <= 2100 ? r.year : null,
  gender: r.gender,
  family: r.family,
  family_label: r.familyLabel,
  concentration: r.concentration,
  concentration_basis: r.concentrationBasis,
  sizes_ml: r.sizesMl,
  perfumers: r.perfumers,
  accords: r.accords,
  notes: r.notes,
  community: r.community,
  themes: r.themes,
  similar_to: r.similar,
  alternative_to: r.alternativeTo,
  popularity: r.popularity,
  price_band: r.priceBand,
  price_basis: r.priceBasis,
  brand_tier: r.brandTier,
  source_url: r.sourceUrl,
  metadata_quality: "partial",
});

let batch = [];
let done = 0;
async function flush() {
  if (!batch.length) return;
  const { error } = await db.from("fragrances").upsert(batch, { onConflict: "provider,external_id" });
  if (error) throw new Error(`Upsert failed after ${done} rows: ${error.message}`);
  done += batch.length;
  batch = [];
  if (done % 4000 === 0) console.log(`  ${done} rows`);
}

const lines = createInterface({ input: createReadStream(file), crlfDelay: Infinity });
for await (const line of lines) {
  if (!line.trim()) continue;
  batch.push(toRow(JSON.parse(line)));
  if (batch.length >= BATCH) await flush();
  if (done + batch.length >= limit) break;
}
await flush();
console.log(`Loaded ${done} fragrances into ${new URL(url).host}`);
