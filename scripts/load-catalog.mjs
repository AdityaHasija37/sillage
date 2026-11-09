#!/usr/bin/env node
// Upserts .data/catalog.jsonl (from build-catalog.mjs) into the fragrances table, then merges
// unverified Open Beauty Facts entries into full catalog entries (DEC-59) and logs the refresh.
// Idempotent: keyed on (provider, external_id). A dataset version that is already loaded is skipped
// unless --force (the merge still runs). Uses the service role, so run it only from a trusted machine
// or the scheduled refresh job. Usage: node scripts/load-catalog.mjs [--env .env.local] [--limit N] [--force]

import { createReadStream, existsSync, readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { matchUnverified } from "../lib/catalog/merge-match.mjs";

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

const force = args.includes("--force");
const metaFile = path.join(root, ".data", "catalog-meta.json");
const meta = existsSync(metaFile) ? JSON.parse(readFileSync(metaFile, "utf8")) : { sourceVersion: null, sourcePublishedAt: null, newReleases: 0 };

// 1. Skip a dataset version that is already loaded.
const { data: last } = await db.from("catalog_refreshes").select("source_version").eq("skipped_unchanged", false).order("created_at", { ascending: false }).limit(1).maybeSingle();
const unchanged = !force && meta.sourceVersion && !meta.sourceVersion.includes("unknown") && last?.source_version === meta.sourceVersion;

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

// The catalog's names, for matching unverified entries (step 2), read in the same pass.
const names = [];
const lines = createInterface({ input: createReadStream(file), crlfDelay: Infinity });
for await (const line of lines) {
  if (!line.trim()) continue;
  const r = JSON.parse(line);
  names.push({ externalId: r.externalId, brand: r.brand, name: r.name });
  if (unchanged) continue;
  batch.push(toRow(r));
  if (batch.length >= BATCH) await flush();
  if (done + batch.length >= limit) break;
}
await flush();
console.log(unchanged ? `Dataset ${meta.sourceVersion} is already loaded; skipped the upsert (use --force to reload).` : `Loaded ${done} fragrances into ${new URL(url).host}`);

// 2. Merge unverified entries that the catalog now has in full.
const unverified = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await db.from("fragrances").select("id, brand, name").eq("provider", "openbeautyfacts").eq("metadata_quality", "unverified").range(from, from + 999);
  if (error) throw new Error(`Reading unverified entries failed: ${error.message}`);
  unverified.push(...data);
  if (data.length < 1000) break;
}
const matches = matchUnverified(unverified, names);
let merged = 0;
for (let i = 0; i < matches.length; i += 200) {
  const chunk = matches.slice(i, i + 200);
  const { data: targets, error } = await db.from("fragrances").select("id, external_id").eq("provider", "fragrantica_decant").in("external_id", chunk.map((m) => m.toExternalId));
  if (error) throw new Error(`Looking up merge targets failed: ${error.message}`);
  const idOf = new Map(targets.map((t) => [t.external_id, t.id]));
  for (const m of chunk) {
    const to = idOf.get(m.toExternalId);
    if (!to) continue;
    const { error: mergeError } = await db.rpc("merge_fragrance", { p_from: m.fromId, p_to: to });
    if (mergeError) console.warn(`  could not merge ${m.fromId}: ${mergeError.message}`);
    else merged++;
  }
}
console.log(`Merged ${merged} of ${unverified.length} unverified entries into full catalog entries.`);

// 3. Log the refresh (no user data: counts and the dataset version only).
const { error: logError } = await db.from("catalog_refreshes").insert({
  source: "fragrantica_decant",
  source_version: meta.sourceVersion,
  source_published_at: meta.sourcePublishedAt,
  loaded: done,
  new_releases: unchanged ? 0 : (meta.newReleases ?? 0),
  merged,
  skipped_unchanged: Boolean(unchanged),
});
if (logError) console.warn(`Could not log the refresh: ${logError.message}`);
