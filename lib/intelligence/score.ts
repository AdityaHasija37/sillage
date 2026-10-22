import { SEASONS, type Season } from "@/lib/domain/fragrance";
import { OCCASION_LABEL, OCCASIONS, similarity, type FragranceProfile, type Occasion } from "./profile";

export const SCORE_ALGORITHM_VERSION = "score-1.0";

/** PRD 08 §5.2 initial weights. Centralised so they can be tuned (and are shown in the UI). */
export const SCORE_WEIGHTS = { season: 0.25, occasion: 0.25, versatility: 0.2, diversity: 0.15, nonRedundancy: 0.15 } as const;
export type DimensionKey = keyof typeof SCORE_WEIGHTS;

export const DIMENSION_LABEL: Record<DimensionKey, string> = {
  season: "Season coverage",
  occasion: "Occasion coverage",
  versatility: "Versatility",
  diversity: "Scent diversity",
  nonRedundancy: "Low redundancy",
};

export const DIMENSION_HELP: Record<DimensionKey, string> = {
  season: "For each season, the best-suited bottle you own (from community season votes). Averaged across the four seasons.",
  occasion: "For each occasion (daily, office, formal, evening, special), the best-suited bottle. Occasion fit is inferred from day/night votes, projection and accords, so treat it as an estimate.",
  versatility: "How many contexts your three most adaptable bottles cover. Near-identical bottles only count once.",
  diversity: "How evenly your bottles spread across scent families, relative to how many you own. Owning more doesn't raise it by itself.",
  nonRedundancy: "How different each bottle is from its closest neighbour on your shelf (accords 60%, families 40%).",
};

export type Band = "emerging" | "developing" | "balanced" | "highly versatile";
export const bandOf = (n: number): Band => (n < 40 ? "emerging" : n < 60 ? "developing" : n < 80 ? "balanced" : "highly versatile");

export type Dimension = {
  key: DimensionKey;
  label: string;
  score: number | null;
  weight: number;
  /** Weight actually applied after renormalisation (0 when unavailable). */
  appliedWeight: number;
  confidence: "high" | "medium" | "low";
  provisional: boolean;
  detail: string;
};

export type Insight = { dimension: DimensionKey; title: string; detail: string; action?: { label: string; href: string } };

export type CollectionScore =
  | { status: "empty"; algorithmVersion: string; message: string }
  | {
      status: "ok";
      overallScore: number;
      band: Band;
      dimensions: Dimension[];
      strengths: Insight[];
      gaps: Insight[];
      coverage: { seasons: Record<Season, { best: string | null; fit: number }>; occasions: Record<Occasion, { best: string | null; fit: number }> };
      confidence: "high" | "medium" | "low";
      missingData: string[];
      completeness: number;
      collectionSize: number;
      algorithmVersion: string;
    };

const SEASON_NAME: Record<Season, string> = { spring: "spring", summer: "summer", fall: "fall", winter: "winter" };
const round = (n: number) => Math.round(n);

/** Deduplicate by fragrance id and by canonical identity (same bottle under two listings). */
export function dedupe(profiles: FragranceProfile[]): FragranceProfile[] {
  const seen = new Set<string>();
  return profiles.filter((p) => {
    const k1 = `id:${p.id}`;
    const k2 = `key:${p.canonicalKey}`;
    if (seen.has(k1) || seen.has(k2)) return false;
    seen.add(k1);
    seen.add(k2);
    return true;
  });
}

function contextFits(p: FragranceProfile): number[] {
  return [...(p.seasonalFit ? SEASONS.map((s) => p.seasonalFit![s]) : []), ...(p.daypartFit ? [p.daypartFit.day, p.daypartFit.night] : []), ...(p.occasionFit ? OCCASIONS.map((o) => p.occasionFit![o]) : [])];
}

/**
 * PRD 08 §5.2. Pure and deterministic: the same set of fragrances (any order) and algorithm version
 * always produce the same result (CS-02). No model is involved in any number here.
 */
export function collectionScore(input: FragranceProfile[]): CollectionScore {
  const owned = dedupe(input).sort((a, b) => a.id.localeCompare(b.id));
  if (owned.length === 0) return { status: "empty", algorithmVersion: SCORE_ALGORITHM_VERSION, message: "Add your first fragrance to see how your collection covers seasons and occasions." };
  const n = owned.length;
  const missingData: string[] = [];

  // Season coverage
  const seasonCov = Object.fromEntries(SEASONS.map((s) => [s, { best: null as string | null, fit: 0 }])) as Record<Season, { best: string | null; fit: number }>;
  const withSeasons = owned.filter((p) => p.seasonalFit);
  for (const s of SEASONS) for (const p of withSeasons) if (p.seasonalFit![s] > seasonCov[s].fit) seasonCov[s] = { best: `${p.brand} ${p.name}`, fit: p.seasonalFit![s] };
  const season = withSeasons.length ? (SEASONS.reduce((t, s) => t + seasonCov[s].fit, 0) / 4) * 100 : null;
  if (withSeasons.length < n) missingData.push(`${n - withSeasons.length} bottle${n - withSeasons.length === 1 ? "" : "s"} without season votes`);

  // Occasion coverage (inferred)
  const occCov = Object.fromEntries(OCCASIONS.map((o) => [o, { best: null as string | null, fit: 0 }])) as Record<Occasion, { best: string | null; fit: number }>;
  const withOcc = owned.filter((p) => p.occasionFit);
  for (const o of OCCASIONS) for (const p of withOcc) if (p.occasionFit![o] > occCov[o].fit) occCov[o] = { best: `${p.brand} ${p.name}`, fit: p.occasionFit![o] };
  const occasion = withOcc.length ? (OCCASIONS.reduce((t, o) => t + occCov[o].fit, 0) / OCCASIONS.length) * 100 : null;
  if (withOcc.length < n) missingData.push(`${n - withOcc.length} bottle${n - withOcc.length === 1 ? "" : "s"} without enough data to infer occasions`);

  // Versatility: best three distinct bottles' breadth; near-duplicates count once.
  const breadth = owned
    .map((p) => ({ p, fits: contextFits(p) }))
    .filter((x) => x.fits.length > 0)
    .map((x) => ({ p: x.p, b: x.fits.reduce((s, v) => s + v, 0) / x.fits.length }))
    .sort((a, b) => b.b - a.b || a.p.id.localeCompare(b.p.id));
  const reps: typeof breadth = [];
  for (const x of breadth) {
    if (reps.length >= 3) break;
    if (!reps.some((r) => similarity(r.p, x.p) >= 0.9)) reps.push(x);
  }
  const versatility = reps.length ? (reps.reduce((s, r) => s + r.b, 0) / reps.length) * 100 : null;

  // Diversity: normalised family entropy and coverage, relative to collection size.
  const fams = owned.map((p) => p.families[0]).filter(Boolean) as string[];
  let diversity: number | null = null;
  if (fams.length) {
    const k = Math.min(fams.length, 10);
    const counts = new Map<string, number>();
    for (const f of fams) counts.set(f, (counts.get(f) ?? 0) + 1);
    const entropy = -[...counts.values()].reduce((s, c) => s + (c / fams.length) * Math.log(c / fams.length), 0);
    const entropyNorm = k > 1 ? entropy / Math.log(k) : 0;
    const coverage = counts.size / k;
    diversity = 100 * (0.5 * Math.min(1, entropyNorm) + 0.5 * Math.min(1, coverage));
  }

  // Low redundancy: 1 − mean nearest-neighbour similarity. Neutral 50 below two bottles.
  let nonRedundancy: number | null;
  let closest: { a: FragranceProfile; b: FragranceProfile; s: number } | null = null;
  if (n < 2) nonRedundancy = 50;
  else {
    const nn = owned.map((p) => {
      let best = 0;
      for (const q of owned) {
        if (q === p) continue;
        const s = similarity(p, q);
        if (s > best) best = s;
        if (!closest || s > closest.s) closest = p.id < q.id ? { a: p, b: q, s } : { a: q, b: p, s };
      }
      return best;
    });
    nonRedundancy = (1 - nn.reduce((s, v) => s + v, 0) / nn.length) * 100;
  }

  const values: Record<DimensionKey, number | null> = { season, occasion, versatility, diversity, nonRedundancy };
  const available = (Object.keys(SCORE_WEIGHTS) as DimensionKey[]).filter((k) => values[k] != null);
  const totalWeight = available.reduce((s, k) => s + SCORE_WEIGHTS[k], 0);
  const completeness = owned.reduce((s, p) => s + p.completeness, 0) / n;

  const dimensions: Dimension[] = (Object.keys(SCORE_WEIGHTS) as DimensionKey[]).map((key) => {
    const v = values[key];
    const provisional = (key === "nonRedundancy" && n < 2) || (key === "diversity" && n < 3);
    const confidence: Dimension["confidence"] = v == null || provisional ? "low" : key === "occasion" ? (n >= 3 ? "medium" : "low") : n >= 5 && completeness >= 0.8 ? "high" : n >= 3 ? "medium" : "low";
    return {
      key,
      label: DIMENSION_LABEL[key],
      score: v == null ? null : Math.max(0, Math.min(100, round(v))),
      weight: SCORE_WEIGHTS[key],
      appliedWeight: v == null ? 0 : Math.round((SCORE_WEIGHTS[key] / totalWeight) * 1000) / 1000,
      confidence,
      provisional,
      detail: describe(key, { seasonCov, occCov, fams, n, closest, reps: reps.map((r) => `${r.p.brand} ${r.p.name}`) }),
    };
  });
  for (const d of dimensions) if (d.score == null) missingData.push(`${d.label} unavailable: not enough data`);

  const overall = round(dimensions.reduce((s, d) => s + (d.score ?? 0) * d.appliedWeight, 0));
  const scored = dimensions.filter((d) => d.score != null && !d.provisional);
  const byScore = [...scored].sort((a, b) => b.score! - a.score! || a.key.localeCompare(b.key));
  const strengths = byScore.slice(0, 2).map((d) => insight(d, "strength", { seasonCov, occCov, closest }));
  const gaps = [...byScore]
    .reverse()
    .slice(0, 2)
    .map((d) => insight(d, "gap", { seasonCov, occCov, closest }));
  // PRD §5.2: an unavailable dimension means low confidence overall, whatever else is known.
  const anyUnavailable = dimensions.some((d) => d.score == null);
  const confidence: "high" | "medium" | "low" = anyUnavailable ? "low" : n >= 5 && completeness >= 0.8 && missingData.length === 0 ? "high" : n >= 3 && completeness >= 0.6 ? "medium" : "low";

  return {
    status: "ok",
    overallScore: Math.max(0, Math.min(100, overall)),
    band: bandOf(overall),
    dimensions,
    strengths,
    gaps,
    coverage: { seasons: seasonCov, occasions: occCov },
    confidence,
    missingData,
    completeness: Math.round(completeness * 100) / 100,
    collectionSize: n,
    algorithmVersion: SCORE_ALGORITHM_VERSION,
  };
}

type Ctx = {
  seasonCov: Record<Season, { best: string | null; fit: number }>;
  occCov: Record<Occasion, { best: string | null; fit: number }>;
  fams?: string[];
  n?: number;
  closest: { a: FragranceProfile; b: FragranceProfile; s: number } | null;
  reps?: string[];
};

function weakest<K extends string>(cov: Record<K, { fit: number }>): K {
  return (Object.entries(cov) as [K, { fit: number }][]).sort((a, b) => a[1].fit - b[1].fit || a[0].localeCompare(b[0]))[0][0];
}
function strongest<K extends string>(cov: Record<K, { fit: number }>): K {
  return (Object.entries(cov) as [K, { fit: number }][]).sort((a, b) => b[1].fit - a[1].fit || a[0].localeCompare(b[0]))[0][0];
}

function describe(key: DimensionKey, c: Ctx): string {
  switch (key) {
    case "season": {
      const w = weakest(c.seasonCov);
      if (c.seasonCov[strongest(c.seasonCov)].fit - c.seasonCov[w].fit < 0.05) return "Every season has a well-suited bottle.";
      return `Strongest in ${SEASON_NAME[strongest(c.seasonCov)]}; thinnest in ${SEASON_NAME[w]} (best: ${c.seasonCov[w].best ?? "nothing"}).`;
    }
    case "occasion": {
      const w = weakest(c.occCov);
      if (c.occCov[strongest(c.occCov)].fit - c.occCov[w].fit < 0.05) return "Every occasion is about equally covered.";
      return `Best covered: ${OCCASION_LABEL[strongest(c.occCov)].toLowerCase()}. Least: ${OCCASION_LABEL[w].toLowerCase()}.`;
    }
    case "versatility":
      return c.reps?.length ? `Most adaptable: ${c.reps.join(", ")}.` : "Not enough context data.";
    case "diversity": {
      if (!c.fams?.length) return "Families unknown.";
      const counts = new Map<string, number>();
      for (const f of c.fams) counts.set(f, (counts.get(f) ?? 0) + 1);
      const [top, cnt] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
      return `${counts.size} famil${counts.size === 1 ? "y" : "ies"} across ${c.fams.length} bottles; ${cnt} ${top}.`;
    }
    case "nonRedundancy":
      return (c.n ?? 0) < 2 ? "Needs at least two bottles; neutral for now." : c.closest ? `Closest pair: ${c.closest.a.name} and ${c.closest.b.name} (${Math.round(c.closest.s * 100)}% alike).` : "";
  }
}

function insight(d: Dimension, kind: "strength" | "gap", c: Ctx): Insight {
  if (kind === "strength") return { dimension: d.key, title: `${d.label}: ${d.score}`, detail: d.detail };
  switch (d.key) {
    case "season": {
      const s = weakest(c.seasonCov);
      return { dimension: d.key, title: `Little for ${SEASON_NAME[s]}`, detail: d.detail, action: { label: `Fill the ${SEASON_NAME[s]} gap`, href: `/app/discover?mode=gaps&season=${s}` } };
    }
    case "occasion": {
      const o = weakest(c.occCov);
      return { dimension: d.key, title: `Thin for ${OCCASION_LABEL[o].toLowerCase()}`, detail: d.detail, action: { label: "Find something for it", href: `/app/discover?mode=gaps${o === "evening" || o === "special" || o === "formal" ? "&daypart=night" : "&daypart=day"}` } };
    }
    case "versatility":
      return { dimension: d.key, title: "Few all-rounders", detail: "Most bottles suit a narrow set of seasons and occasions.", action: { label: "Look for a versatile pick", href: "/app/discover?mode=different" } };
    case "diversity":
      return { dimension: d.key, title: "Leans on one family", detail: d.detail, action: { label: "Try a different direction", href: "/app/discover?mode=different" } };
    case "nonRedundancy":
      return { dimension: d.key, title: "Some bottles overlap", detail: d.detail, action: c.closest ? { label: "Compare them", href: `/app/fragrance/${c.closest.a.id}` } : undefined };
  }
}

export type ScorePreview =
  | { status: "duplicate"; current: CollectionScore; message: string }
  | {
      status: "ok";
      current: CollectionScore;
      hypothetical: CollectionScore;
      delta: number;
      dimensionDeltas: { key: DimensionKey; label: string; before: number | null; after: number | null; delta: number }[];
      adds: string[];
      overlap: { name: string; similarity: number } | null;
      lowConfidence: boolean;
    };

/** PRD 08 §5.3: read-only "what would this bottle change?" Never mutates the collection (CS-05). */
export function previewCandidate(owned: FragranceProfile[], candidate: FragranceProfile): ScorePreview {
  const current = collectionScore(owned);
  if (owned.some((p) => p.id === candidate.id || p.canonicalKey === candidate.canonicalKey)) {
    return { status: "duplicate", current, message: "You already own this fragrance, so adding it wouldn't change your coverage." };
  }
  const hypothetical = collectionScore([...owned, candidate]);
  const before = current.status === "ok" ? current : null;
  const after = hypothetical.status === "ok" ? hypothetical : null;
  const dimensionDeltas = (after?.dimensions ?? []).map((d) => {
    const b = before?.dimensions.find((x) => x.key === d.key)?.score ?? null;
    return { key: d.key, label: d.label, before: b, after: d.score, delta: (d.score ?? 0) - (b ?? 0) };
  });
  const adds: string[] = [];
  if (before && after) {
    for (const s of SEASONS) if (after.coverage.seasons[s].fit - before.coverage.seasons[s].fit >= 0.1) adds.push(`better ${s} coverage`);
    for (const o of OCCASIONS) if (after.coverage.occasions[o].fit - before.coverage.occasions[o].fit >= 0.1) adds.push(`more for ${OCCASION_LABEL[o].toLowerCase()}`);
    if (candidate.families[0] && !owned.some((p) => p.families[0] === candidate.families[0])) adds.push(`a new family (${candidate.families[0]})`);
  } else if (after) adds.push("your first bottle");
  let overlap: { name: string; similarity: number } | null = null;
  for (const p of owned) {
    const s = similarity(p, candidate);
    if (!overlap || s > overlap.similarity) overlap = { name: `${p.brand} ${p.name}`, similarity: Math.round(s * 100) / 100 };
  }
  return {
    status: "ok",
    current,
    hypothetical,
    delta: (after?.overallScore ?? 0) - (before?.overallScore ?? 0),
    dimensionDeltas,
    adds,
    overlap,
    lowConfidence: candidate.completeness < 0.6,
  };
}
