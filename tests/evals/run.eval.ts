/**
 * Sillage eval suite (QA doc "Evaluation plan"). Run with `npm run evals` against a database
 * loaded with the catalog. Writes docs/evals/latest.json, docs/evals/REPORT.md and a dated copy
 * in docs/evals/history/. Every number on the landing page and /evals comes from this file.
 *
 * Sections:
 *  1. Offer matching: precision/recall of "exact" on hand-annotated adversarial pairs.
 *  2. Recommendations: synthetic personas with criteria written before the run.
 *  3. Grounding: adversarial model outputs (invented ids and prices) must never survive.
 *  4. Catalog coverage: can 20 commonly owned fragrances be found by name?
 *  5. Live agent (only with ANTHROPIC_API_KEY): grounding, latency and cost on real prompts.
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import type Anthropic from "@anthropic-ai/sdk";
import { it } from "vitest";
import { runAdvisor } from "@/lib/agent/advisor";
import { groundAnswer } from "@/lib/agent/grounding";
import type { AdvisorContext } from "@/lib/agent/tools";
import { dayShare, displayName, FRAGRANCE_COLUMNS, PRICE_BAND_RANGE, seasonShares, toFragrance, type Fragrance, type Season } from "@/lib/domain/fragrance";
import { accordVector, cosine, EMPTY_PREFERENCES, type OwnedFragrance, type Preferences, type Sentiment } from "@/lib/domain/profile";
import { compareOffers, matchListing, type OfferTarget } from "@/lib/offers/match";
import { SampleOfferProvider } from "@/lib/offers/providers";
import { ENGINE_VERSION, matchingNotes, recommendCandidates, type Mode, type RecommendationRequest } from "@/lib/recommendation/engine";

const root = process.cwd();
try {
  process.loadEnvFile(path.join(root, ".env.local"));
} catch {}
const label = process.env.EVAL_LABEL ?? "run";

type Case = {
  id: string;
  mode: Mode;
  persona: string;
  owned: [string, string, Sentiment | null][];
  prefs?: Partial<Preferences>;
  request?: Omit<RecommendationRequest, "mode">;
  expect: {
    anchorCosineMin?: { anchor: string; min: number };
    acceptableAny?: string[];
    maxOverlapBelow?: number;
    top1FamilyIn?: string[];
    top1FamilyNotIn?: string[];
    everyTop3HasReason?: string[];
    anyTop3HasReason?: string[];
    caveatsInclude?: string[];
    minLongevityTop3?: number;
    seasonShareMin?: { season: Season; min: number };
    top1SeasonIn?: Season[];
    dayShareMin?: number;
    dayShareMinTop1?: number;
    noGapReasons?: boolean;
    noAlternatives?: boolean;
    anyTop5HasReason?: string[];
  };
};

it("eval suite", async () => {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const started = Date.now();

  // ── Catalog ──
  const { count } = await db.from("fragrances").select("id", { count: "exact", head: true });
  const pool: Fragrance[] = [];
  for (let from = 0; from < 3000; from += 1000) {
    const { data, error } = await db.from("fragrances").select(FRAGRANCE_COLUMNS).gte("community_votes", 300).gte("community_rating", 3.5).order("popularity", { ascending: false }).range(from, from + 999);
    if (error) throw error;
    pool.push(...(data ?? []).map(toFragrance));
  }
  const byKey = async (key: string): Promise<Fragrance> => {
    const [brand, name] = key.split("|");
    const { data } = await db.from("fragrances").select(FRAGRANCE_COLUMNS).eq("brand", brand).eq("name", name).order("community_votes", { ascending: false }).limit(1);
    if (!data?.length) throw new Error(`Eval fixture not in catalog: ${key}`);
    return toFragrance(data[0]);
  };

  // ── 1. Offer matching ──
  const offerSet = JSON.parse(readFileSync(path.join(root, "tests/evals/offer-pairs.json"), "utf8")) as { targets: Record<string, OfferTarget>; pairs: { target: string; title: string; expected: "exact" | "probable" | "rejected" }[] };
  let tp = 0, fp = 0, fn = 0, agree = 0;
  const offerRows = offerSet.pairs.map((p) => {
    const m = matchListing(offerSet.targets[p.target], { provider: "sample", merchant: "Eval", title: p.title, url: "https://example.com/x", listPrice: 100, shippingPrice: 0, taxPrice: null, availability: null, currency: "USD" });
    if (m.status === "exact" && p.expected === "exact") tp++;
    if (m.status === "exact" && p.expected !== "exact") fp++;
    if (m.status !== "exact" && p.expected === "exact") fn++;
    if (m.status === p.expected) agree++;
    return { target: p.target, title: p.title, expected: p.expected, actual: m.status, reasons: m.reasons, ok: m.status === p.expected };
  });
  const offers = {
    pairs: offerRows.length,
    precision: tp + fp ? tp / (tp + fp) : 1,
    recall: tp + fn ? tp / (tp + fn) : 1,
    agreement: agree / offerRows.length,
    falseExact: offerRows.filter((r) => r.actual === "exact" && r.expected !== "exact"),
    disagreements: offerRows.filter((r) => !r.ok),
  };

  // ── 2. Recommendations ──
  const cases = (JSON.parse(readFileSync(path.join(root, "tests/evals/recommendation-cases.json"), "utf8")) as { cases: Case[] }).cases;
  const recRows: { id: string; mode: Mode; persona: string; passed: boolean; checks: { name: string; hard: boolean; ok: boolean; detail?: string }[]; top: { name: string; family: string | null; score: number; reasons: string[] }[]; ms: number }[] = [];
  let hardChecks = 0, hardPassed = 0, softChecks = 0, softPassed = 0;
  for (const c of cases) {
    const owned: OwnedFragrance[] = [];
    for (const [brand, name, sentiment] of c.owned) owned.push({ fragrance: await byKey(`${brand}|${name}`), sentiment, rating: null });
    const prefs: Preferences = { ...EMPTY_PREFERENCES, ...c.prefs };
    const neighbourIds = [...new Set(owned.flatMap((o) => o.fragrance.similarTo.map((s) => s.externalId)))].slice(0, 80);
    const { data: nb } = neighbourIds.length ? await db.from("fragrances").select(FRAGRANCE_COLUMNS).eq("provider", "fragrantica_decant").in("external_id", neighbourIds) : { data: [] };
    const ids = new Set(pool.map((f) => f.id));
    const catalog = [...pool, ...(nb ?? []).map(toFragrance).filter((f) => !ids.has(f.id))];
    const t0 = performance.now();
    const res = recommendCandidates({ mode: c.mode, ...c.request }, prefs, owned, catalog);
    const ms = performance.now() - t0;
    const top3 = res.results.slice(0, 3);
    const top5 = res.results.slice(0, 5);
    const checks: { name: string; hard: boolean; ok: boolean; detail?: string }[] = [];
    const ownedIds = new Set(owned.map((o) => o.fragrance.id));
    const budget = c.request?.budgetMax ?? prefs.budgetMax;
    checks.push({ name: "returns results", hard: true, ok: res.results.length > 0 });
    checks.push({ name: "nothing owned", hard: true, ok: res.results.every((r) => !ownedIds.has(r.fragranceId)) });
    if (prefs.dislikedNotes.length) checks.push({ name: "no disliked notes", hard: true, ok: res.results.every((r) => matchingNotes(r.fragrance, prefs.dislikedNotes).length === 0) });
    if (budget) checks.push({ name: "within budget", hard: true, ok: res.results.every((r) => !r.fragrance.priceBand || PRICE_BAND_RANGE[r.fragrance.priceBand][0] < budget) });
    if (prefs.marketedFor !== "any") checks.push({ name: "marketing preference", hard: true, ok: res.results.every((r) => (prefs.marketedFor === "men" ? r.fragrance.gender !== "female" : r.fragrance.gender !== "male")) });
    const e = c.expect;
    if (e.anchorCosineMin) {
      const anchor = owned.find((o) => `${o.fragrance.brand}|${o.fragrance.name}` === e.anchorCosineMin!.anchor)!;
      const mean = top3.reduce((s, r) => s + cosine(accordVector(r.fragrance), accordVector(anchor.fragrance)), 0) / Math.max(1, top3.length);
      checks.push({ name: `top-3 similarity to anchor ≥ ${e.anchorCosineMin.min}`, hard: false, ok: mean >= e.anchorCosineMin.min, detail: mean.toFixed(2) });
    }
    if (e.acceptableAny) {
      const names = top5.map((r) => `${r.fragrance.brand}|${r.fragrance.name}`);
      checks.push({ name: "an annotated good answer in top 5", hard: false, ok: e.acceptableAny.some((a) => names.includes(a)) });
    }
    if (e.maxOverlapBelow) {
      const worst = Math.max(...res.results.map((r) => Math.max(...owned.map((o) => cosine(accordVector(r.fragrance), accordVector(o.fragrance))))));
      checks.push({ name: `every pick < ${e.maxOverlapBelow} overlap with owned`, hard: false, ok: worst < e.maxOverlapBelow, detail: worst.toFixed(2) });
    }
    if (e.top1FamilyIn) checks.push({ name: `top pick family in ${e.top1FamilyIn.join("/")}`, hard: false, ok: e.top1FamilyIn.includes(res.results[0]?.fragrance.family ?? ""), detail: String(res.results[0]?.fragrance.family) });
    if (e.top1FamilyNotIn) checks.push({ name: `top pick family not ${e.top1FamilyNotIn.join("/")}`, hard: false, ok: !!res.results[0] && !e.top1FamilyNotIn.includes(res.results[0].fragrance.family ?? ""), detail: String(res.results[0]?.fragrance.family) });
    if (e.everyTop3HasReason) checks.push({ name: "every top-3 pick names a gap it fills", hard: false, ok: top3.length > 0 && top3.every((r) => r.reasons.some((x) => e.everyTop3HasReason!.includes(x.code))) });
    if (e.anyTop3HasReason) checks.push({ name: `a top-3 pick has ${e.anyTop3HasReason.join("/")}`, hard: false, ok: top3.some((r) => r.reasons.some((x) => e.anyTop3HasReason!.includes(x.code))) });
    if (e.caveatsInclude) checks.push({ name: `reports ${e.caveatsInclude.join(" + ")}`, hard: false, ok: e.caveatsInclude.every((code) => res.globalCaveats.some((g) => g.code === code)) });
    if (e.minLongevityTop3) checks.push({ name: `top-3 longevity ≥ ${e.minLongevityTop3}`, hard: false, ok: top3.every((r) => (r.fragrance.community?.longevity ?? 0) >= e.minLongevityTop3!) });
    if (e.seasonShareMin) checks.push({ name: `every pick suits ${e.seasonShareMin.season}`, hard: true, ok: res.results.every((r) => (seasonShares(r.fragrance)?.[e.seasonShareMin!.season] ?? 1) >= e.seasonShareMin!.min) });
    if (e.top1SeasonIn) {
      const sh = res.results[0] ? seasonShares(res.results[0].fragrance) : null;
      const best = sh ? (Object.entries(sh).sort((a, b) => b[1] - a[1])[0][0] as Season) : null;
      checks.push({ name: `top pick's strongest season in ${e.top1SeasonIn.join("/")}`, hard: false, ok: !!best && e.top1SeasonIn.includes(best), detail: String(best) });
    }
    if (e.dayShareMin) checks.push({ name: "every pick works in the daytime", hard: true, ok: res.results.every((r) => (dayShare(r.fragrance) ?? 1) >= e.dayShareMin!) });
    if (e.dayShareMinTop1) checks.push({ name: "top pick is daytime-leaning", hard: false, ok: (dayShare(res.results[0]?.fragrance ?? ({ community: null } as Fragrance)) ?? 0) >= e.dayShareMinTop1 });
    if (e.noAlternatives) checks.push({ name: "no budget alternatives when switched off", hard: true, ok: res.results.every((r) => !r.fragrance.alternativeTo) });
    if (e.anyTop5HasReason) checks.push({ name: `a top-5 pick has ${e.anyTop5HasReason.join("/")}`, hard: false, ok: top5.some((r) => r.reasons.some((x) => e.anyTop5HasReason!.includes(x.code))) });
    if (e.noGapReasons) checks.push({ name: "invents no gap", hard: false, ok: res.results.every((r) => !r.reasons.some((x) => x.code.startsWith("FILLS_"))) });

    for (const ch of checks) {
      if (ch.hard) {
        hardChecks++;
        if (ch.ok) hardPassed++;
      } else {
        softChecks++;
        if (ch.ok) softPassed++;
      }
    }
    recRows.push({
      id: c.id,
      mode: c.mode,
      persona: c.persona,
      passed: checks.every((x) => x.ok),
      checks,
      top: top5.map((r) => ({ name: displayName(r.fragrance), family: r.fragrance.family, score: r.score, reasons: r.reasons.map((x) => x.code) })),
      ms: Math.round(ms * 10) / 10,
    });
  }
  const recommendations = {
    total: recRows.length,
    passed: recRows.filter((r) => r.passed).length,
    exclusionCompliance: hardChecks ? hardPassed / hardChecks : 1,
    relevance: softChecks ? softPassed / softChecks : 1,
    byMode: Object.fromEntries((["similar", "different", "gaps"] as const).map((m) => [m, { total: recRows.filter((r) => r.mode === m).length, passed: recRows.filter((r) => r.mode === m && r.passed).length }])),
    medianMs: [...recRows.map((r) => r.ms)].sort((a, b) => a - b)[Math.floor(recRows.length / 2)],
    poolSize: pool.length,
    cases: recRows,
  };

  // ── 3. Grounding (adversarial model outputs, no API needed) ──
  const sample = pool.slice(0, 40);
  const owned = [{ fragrance: sample[0], sentiment: "love" as const, rating: null }, { fragrance: sample[1], sentiment: "like" as const, rating: null }];
  const ctx: AdvisorContext = {
    owned,
    preferences: EMPTY_PREFERENCES,
    searchCatalog: async (q) => sample.filter((f) => f.name.toLowerCase().includes(q.toLowerCase())).map((f) => ({ id: f.id, brand: f.brand, name: f.name, family: f.family, concentration: f.concentration, year: f.year, accords: [], rating: null, votes: 0, source: f.provider, dataQuality: f.dataQuality, imageUrl: null })),
    getFragrance: async (id) => sample.find((f) => f.id === id) ?? null,
    recommend: async (i) => ({ ...recommendCandidates(i, EMPTY_PREFERENCES, owned, sample), runId: null }),
    findOffers: async (f, concentration, sizeMl) => {
      const target = { brand: f.brand, name: f.name, concentration, sizeMl };
      return { target, comparison: compareOffers(target, await new SampleOfferProvider(f.priceBand).searchOffers(target)), provider: { id: "sample", label: "Sample", live: false }, checkedAt: new Date().toISOString(), fromCache: false, notice: "no_live_key" };
    },
  };
  const attacks = [
    { name: "invented fragrance id", text: (real: string) => `Try [[f:${real}]] and [[f:00000000-dead-4bee-8000-000000000000]].` },
    { name: "id of a real fragrance the tools never returned", text: (real: string) => `Try [[f:${real}]] or [[f:${pool[2500].id}]].` },
    { name: "invented price", text: (real: string) => `[[f:${real}]] is $37.50 at most stores.` },
    { name: "invented price range", text: (real: string) => `[[f:${real}]] usually runs $19 to $25.` },
    { name: "uppercase citation of a valid id", text: (real: string) => `Try [[f:${real.toUpperCase()}]].` },
  ];
  let injected = 0, survived = 0;
  const groundingRows: { attack: string; planted: number; survived: number; removedIds: number; removedPrices: number; keptValid: number }[] = [];
  for (const a of attacks) {
    const script = [
      () => ({ content: [{ type: "tool_use", id: "t1", name: "recommend_candidates", input: { mode: "different", budget_max_usd: null, season: null, daypart: null, performance: null } }], stop_reason: "tool_use" }),
      (req: { messages: Anthropic.MessageParam[] }) => {
        const last = req.messages.at(-1)!.content as Anthropic.ToolResultBlockParam[];
        const real = (JSON.parse(last[0].content as string) as { candidates: { id: string }[] }).candidates[0].id;
        return { content: [{ type: "text", text: a.text(real) }], stop_reason: "end_turn" };
      },
    ];
    let i = 0;
    const create = async (req: { messages: Anthropic.MessageParam[] }) => ({ id: "m", type: "message", role: "assistant", model: "eval", usage: { input_tokens: 0, output_tokens: 0 }, ...script[i++](req) });
    const client = { beta: { messages: { create } }, messages: { create } } as unknown as Anthropic;
    const reply = await runAdvisor("eval", [], ctx, { client });
    const bad = (reply.text.match(/00000000-dead|\$37\.50|\$19|\$25/g) ?? []).length + reply.citedIds.filter((id) => id === pool[2500].id.toLowerCase()).length;
    const planted = a.name.includes("price") || a.name.includes("id") ? (a.name.includes("range") ? 2 : a.name.startsWith("uppercase") ? 0 : 1) : 0;
    injected += planted;
    survived += bad;
    groundingRows.push({ attack: a.name, planted, survived: bad, removedIds: reply.trace.grounding.removedIds.length, removedPrices: reply.trace.grounding.removedPrices.length, keptValid: reply.citedIds.length });
  }
  // Pure-function cases too.
  const pure = groundAnswer("A [[f:11111111-1111-4111-8111-111111111111]] for $99.", new Set(), ["$100"]);
  injected += 2;
  survived += pure.citedIds.length + (pure.text.includes("$99") ? 1 : 0);
  const grounding = { injected, fabricated: survived, scenarios: groundingRows };

  // ── 4. Catalog coverage ──
  const common = ["Sauvage", "Bleu de Chanel", "Aventus", "Acqua di Gio", "Light Blue", "La Vie Est Belle", "Black Opium", "Baccarat Rouge 540", "Tobacco Vanille", "Khamrah", "Le Male", "Eros", "1 Million", "Good Girl", "Coco Mademoiselle", "Santal 33", "Terre d'Hermes", "Cool Water", "Libre", "Cloud"];
  const coverageRows: { query: string; found: boolean; top: string | null; ms: number }[] = [];
  for (const q of common) {
    const t0 = performance.now();
    const { data } = await db.rpc("search_fragrances", { p_query: q, p_limit: 5, p_offset: 0 });
    coverageRows.push({ query: q, found: (data ?? []).length > 0, top: data?.[0] ? `${data[0].brand} ${data[0].name}` : null, ms: Math.round(performance.now() - t0) });
  }
  const catalog = { fragrances: count ?? 0, coverage: coverageRows.filter((r) => r.found).length / coverageRows.length, coverageRows, medianSearchMs: [...coverageRows.map((r) => r.ms)].sort((a, b) => a - b)[10] };

  // ── 5. Live agent (optional) ──
  const live = { ran: false as boolean, reason: process.env.ANTHROPIC_API_KEY ? "" : "ANTHROPIC_API_KEY not set; live agent eval skipped" };

  const report = {
    generatedAt: new Date().toISOString(),
    label,
    engineVersion: ENGINE_VERSION,
    durationMs: Date.now() - started,
    catalog,
    offers,
    recommendations,
    grounding,
    live,
  };
  const dir = path.join(root, "docs/evals");
  mkdirSync(path.join(dir, "history"), { recursive: true });
  writeFileSync(path.join(dir, "latest.json"), JSON.stringify(report, null, 2));
  writeFileSync(path.join(dir, "history", `${report.generatedAt.slice(0, 10)}-${label}.json`), JSON.stringify(report, null, 2));
  writeFileSync(path.join(dir, "REPORT.md"), markdown(report));
  // Compact run-over-run summary for the /evals page.
  const history = readdirSync(path.join(dir, "history"))
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => {
      const h = JSON.parse(readFileSync(path.join(dir, "history", f), "utf8"));
      return { file: f, label: h.label, generatedAt: h.generatedAt, engineVersion: h.engineVersion, offerPrecision: h.offers.precision, offerRecall: h.offers.recall, recPassed: h.recommendations.passed, recTotal: h.recommendations.total, exclusionCompliance: h.recommendations.exclusionCompliance, relevance: h.recommendations.relevance, fabricated: h.grounding.fabricated };
    });
  writeFileSync(path.join(dir, "history.json"), JSON.stringify(history, null, 2));
  console.log(
    `offers precision ${(offers.precision * 100).toFixed(1)}% recall ${(offers.recall * 100).toFixed(1)}% agreement ${(offers.agreement * 100).toFixed(1)}% | recs ${recommendations.passed}/${recommendations.total} (exclusions ${(recommendations.exclusionCompliance * 100).toFixed(1)}%, relevance ${(recommendations.relevance * 100).toFixed(1)}%) | grounding fabricated ${grounding.fabricated}/${grounding.injected} | coverage ${(catalog.coverage * 100).toFixed(0)}%`,
  );
}, 120_000);

function markdown(r: {
  generatedAt: string;
  label: string;
  engineVersion: string;
  catalog: { fragrances: number; coverage: number; medianSearchMs: number };
  offers: { pairs: number; precision: number; recall: number; agreement: number; disagreements: { target: string; title: string; expected: string; actual: string; reasons: string[] }[] };
  recommendations: { total: number; passed: number; exclusionCompliance: number; relevance: number; medianMs: number; poolSize: number; byMode: Record<string, { total: number; passed: number }>; cases: { id: string; persona: string; passed: boolean; checks: { name: string; ok: boolean; detail?: string }[]; top: { name: string }[] }[] };
  grounding: { injected: number; fabricated: number };
  live: { ran: boolean; reason: string };
}) {
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
  const lines = [
    `# Eval report`,
    ``,
    `Generated ${r.generatedAt} (label: \`${r.label}\`, engine ${r.engineVersion}). Produced by \`npm run evals\`; numbers are measured, not targets.`,
    ``,
    `| Area | Result |`,
    `|---|---|`,
    `| Catalog size | ${r.catalog.fragrances.toLocaleString("en-US")} fragrances; ${pct(r.catalog.coverage)} of 20 common bottles found by name; median search ${r.catalog.medianSearchMs} ms (local) |`,
    `| Offer matching (${r.offers.pairs} adversarial pairs) | precision of "exact" ${pct(r.offers.precision)}, recall ${pct(r.offers.recall)}, three-way agreement ${pct(r.offers.agreement)} |`,
    `| Recommendations (${r.recommendations.total} synthetic personas) | ${r.recommendations.passed}/${r.recommendations.total} pass every criterion; exclusion compliance ${pct(r.recommendations.exclusionCompliance)}; relevance checks ${pct(r.recommendations.relevance)}; median ${r.recommendations.medianMs} ms over ${r.recommendations.poolSize.toLocaleString("en-US")} candidates |`,
    `| Grounding | ${r.grounding.fabricated} of ${r.grounding.injected} planted fake ids/prices reached the user |`,
    `| Live agent | ${r.live.ran ? "ran" : r.live.reason} |`,
    ``,
    `## Offer disagreements`,
    ``,
    r.offers.disagreements.length ? `| Target | Listing | Expected | Got | Reasons |\n|---|---|---|---|---|\n` + r.offers.disagreements.map((d) => `| ${d.target} | ${d.title} | ${d.expected} | ${d.actual} | ${d.reasons.join(", ")} |`).join("\n") : "None.",
    ``,
    `## Recommendation cases`,
    ``,
    `| Case | Persona | Result | Failed checks | Top 3 |`,
    `|---|---|---|---|---|`,
    ...r.recommendations.cases.map((c) => `| ${c.id} | ${c.persona} | ${c.passed ? "pass" : "**fail**"} | ${c.checks.filter((x) => !x.ok).map((x) => `${x.name}${x.detail ? ` (${x.detail})` : ""}`).join("; ") || "–"} | ${c.top.slice(0, 3).map((t) => t.name).join("; ")} |`),
    ``,
  ];
  return lines.join("\n");
}
