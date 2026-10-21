#!/usr/bin/env node
// Builds .data/catalog.jsonl from the open Decant dataset (a published dump of Fragrantica's
// public catalogue: https://codeberg.org/decant/pages). See docs/DECISIONS.md DEC-03.
//
// The raw dump is downloaded at build time and never committed. Only factual fields are kept:
// identity, note pyramid, accord strengths, community vote aggregates and short review-theme
// labels. Long-form descriptions and Fragrantica's images are deliberately dropped.
//
// Usage: node scripts/build-catalog.mjs [--min-votes 50] [--src <dir with perfumes.db + perfumes_cold.db>]

import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";

process.removeAllListeners("warning"); // node:sqlite prints an ExperimentalWarning on Node 22
const { DatabaseSync } = await import("node:sqlite");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const MIN_VOTES = Number(arg("min-votes", "50"));
const srcDir = path.resolve(arg("src", path.join(root, ".data", "decant")));
const SOURCE = "https://codeberg.org/decant/pages/raw/branch/pages";

async function ensureSource(file) {
  const target = path.join(srcDir, file);
  if (existsSync(target)) return target;
  mkdirSync(srcDir, { recursive: true });
  console.log(`Downloading ${file}.gz from ${SOURCE} …`);
  const res = await fetch(`${SOURCE}/${file}.gz`);
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);
  writeFileSync(target, gunzipSync(Buffer.from(await res.arrayBuffer())));
  return target;
}

const hot = new DatabaseSync(await ensureSource("perfumes.db"), { readOnly: true });
const cold = new DatabaseSync(await ensureSource("perfumes_cold.db"), { readOnly: true });

const tiersPath = path.join(root, "db", "seed", "brand-price-tiers.json");
const brandTiers = existsSync(tiersPath) ? JSON.parse(readFileSync(tiersPath, "utf8")) : {};

// Fragrantica family label ("Aromatic Fougere", "Oriental Vanilla") → Sillage's coarse family.
function coarseFamily(label, accords) {
  if (label) {
    if (/gourmand|vanilla/.test(label)) return "gourmand";
    if (/aquatic/.test(label)) return "aquatic";
    if (/fougere/.test(label)) return "aromatic";
    const first = label.split(" ")[0];
    const map = { floral: "floral", oriental: "amber", woody: "woody", citrus: "citrus", aromatic: "aromatic", chypre: "chypre", leather: "leather", green: "green" };
    if (map[first]) return map[first];
  }
  const byAccord = {
    citrus: "citrus", aquatic: "aquatic", marine: "aquatic", ozonic: "aquatic", aromatic: "aromatic", lavender: "aromatic", herbal: "aromatic", "fresh spicy": "aromatic",
    green: "green", floral: "floral", "white floral": "floral", "yellow floral": "floral", rose: "floral", tuberose: "floral", iris: "floral", violet: "floral", powdery: "floral",
    woody: "woody", oud: "woody", patchouli: "woody", earthy: "woody", mossy: "chypre", amber: "amber", "warm spicy": "amber", balsamic: "amber", smoky: "amber", tobacco: "amber",
    vanilla: "gourmand", sweet: "gourmand", caramel: "gourmand", coffee: "gourmand", chocolate: "gourmand", cacao: "gourmand", honey: "gourmand", fruity: "floral", leather: "leather",
  };
  for (const a of accords) if (byAccord[a.name]) return byAccord[a.name];
  return null;
}

const CONCENTRATIONS = [
  [/\bextrait\b/i, "Extrait"],
  [/\belixir\b/i, "Elixir"],
  [/\beau de parfum\b|\bedp\b/i, "EDP"],
  [/\beau de toilette\b|\bedt\b/i, "EDT"],
  [/\beau de cologne\b|\bedc\b/i, "EDC"],
  [/\bcologne\b/i, "Cologne"],
  [/\b(le |l'|pure )?parfum\b/i, "Parfum"],
];
function concentrationOf(name, description) {
  for (const [re, c] of CONCENTRATIONS) if (re.test(name)) return { value: c, basis: "name" };
  const m = /available as [^.]*?(eau de parfum|eau de toilette|eau de cologne|extrait|parfum)\b/i.exec(description ?? "");
  if (m) for (const [re, c] of CONCENTRATIONS) if (re.test(m[1])) return { value: c, basis: "description" };
  return { value: null, basis: null };
}

// Sizes only when the source text states them ("available as 60 and 100 ml Eau de Toilette").
function sizesOf(description) {
  const m = /available[^.]*?((?:\d{1,3}(?:[.,]\d)?\s*(?:,|and|or|&)?\s*)+)\s*ml/i.exec(description ?? "");
  if (!m) return [];
  const sizes = [...m[1].matchAll(/\d{1,3}(?:[.,]\d)?/g)].map((s) => Number(s[0].replace(",", "."))).filter((n) => n >= 5 && n <= 500);
  return [...new Set(sizes)].sort((a, b) => a - b);
}

const normalize = (s) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const notesStmt = hot.prepare(
  "select n.name, pn.tier, pn.weight from perfume_notes pn join notes n on n.id = pn.note_id where pn.perfume_id = ? order by pn.tier, pn.ord",
);
const accordsStmt = hot.prepare(
  "select a.name, pa.strength from perfume_accords pa join accords a on a.id = pa.accord_id where pa.perfume_id = ? order by pa.strength desc",
);
const perfumersStmt = hot.prepare(
  "select pr.name from perfume_perfumers pp join perfumers pr on pr.id = pp.perfumer_id where pp.perfume_id = ? order by pp.ord",
);
const coldStmt = cold.prepare("select doc from perfumes_cold where id = ?");

const rows = hot
  .prepare(
    `select p.*, b.name as brand from perfumes p join brands b on b.id = p.brand_id
     where p.vote_count >= ? and p.name is not null order by p.magnitude desc`,
  )
  .all(MIN_VOTES);

const kept = new Set(rows.map((r) => r.id));
mkdirSync(path.join(root, ".data"), { recursive: true });
const out = createWriteStream(path.join(root, ".data", "catalog.jsonl"));
const stats = { total: 0, withFamily: 0, withConcentration: 0, withSizes: 0, withPriceBand: 0, withThemes: 0 };

for (const r of rows) {
  const doc = JSON.parse(coldStmt.get(r.id)?.doc ?? "{}");
  const description = doc.description ?? "";
  const famMatch = / is an? ([a-z ]+?) fragrance for /i.exec(description);
  const familyLabel = famMatch ? famMatch[1].toLowerCase().trim() : null;
  const accords = accordsStmt.all(r.id).map((a) => ({ name: a.name.toLowerCase(), strength: a.strength }));
  const tiers = { 0: "top", 1: "middle", 2: "base" };
  const notes = { top: [], middle: [], base: [], flat: [] };
  for (const n of notesStmt.all(r.id)) notes[tiers[n.tier] ?? "flat"].push({ name: n.name, weight: n.weight });
  const conc = concentrationOf(r.name, description);
  const sizes = sizesOf(description);
  const tier = brandTiers[r.brand] ?? null;
  // Up to three review themes each way, kept only when more wearers agreed than disagreed.
  const themes = (list) =>
    (list ?? [])
      .filter(([, up, down]) => up > down)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([text, up, down]) => ({ text: String(text).slice(0, 80), agree: up, disagree: down }));
  const pros = themes(doc.pros);
  const cons = themes(doc.cons);
  const similar = (doc.reminds_me_of ?? [])
    .filter(([id, up, down]) => kept.has(id) && up > down)
    .slice(0, 8)
    .map(([id, up, down]) => ({ externalId: String(id), agree: up, disagree: down }));

  const record = {
    provider: "fragrantica_decant",
    externalId: String(r.id),
    brand: r.brand,
    name: r.name,
    canonicalKey: `${normalize(r.brand)}::${normalize(r.name)}`,
    year: r.year ?? null,
    gender: r.gender ?? null,
    family: coarseFamily(familyLabel, accords),
    familyLabel,
    concentration: conc.value,
    concentrationBasis: conc.basis,
    sizesMl: sizes,
    perfumers: perfumersStmt.all(r.id).map((p) => p.name),
    accords,
    notes,
    community: {
      rating: r.rating_avg,
      votes: r.vote_count,
      longevity: r.longevity_avg,
      sillage: r.sillage_avg,
      priceValue: r.price_value_avg,
      have: r.have_count,
      had: r.had_count,
      want: r.want_count,
      seasons: { winter: r.winter, spring: r.spring, summer: r.summer, fall: r.autumn },
      daypart: { day: r.day, night: r.night },
    },
    themes: { pros, cons },
    similar,
    popularity: r.magnitude,
    priceBand: tier?.band ?? null,
    priceBasis: tier ? `brand_tier_${tier.confidence}` : null,
    brandTier: tier?.tier ?? null,
    sourceUrl: `https://www.fragrantica.com/perfume/${r.slug}-${r.id}.html`,
  };
  stats.total++;
  if (record.family) stats.withFamily++;
  if (record.concentration) stats.withConcentration++;
  if (sizes.length) stats.withSizes++;
  if (record.priceBand) stats.withPriceBand++;
  if (pros.length || cons.length) stats.withThemes++;
  out.write(JSON.stringify(record) + "\n");
}
out.end();
await new Promise((resolve) => out.on("finish", resolve));
// Closing here also keeps both handles reachable: node:sqlite finalizes statements of a GC'd db.
hot.close();
cold.close();
console.log(JSON.stringify({ minVotes: MIN_VOTES, ...stats }, null, 2));
