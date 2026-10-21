import {
  allNotes,
  dayShare,
  FAMILIES,
  fitsDayparts,
  fitsSeasons,
  seasonShares,
  SEASONS,
  type Daypart,
  type Family,
  type Fragrance,
  type Season,
} from "./fragrance";

export const SENTIMENTS = ["love", "like", "neutral", "dislike"] as const;
export type Sentiment = (typeof SENTIMENTS)[number];

export type OwnedFragrance = { fragrance: Fragrance; sentiment: Sentiment | null; rating: number | null };

export type Preferences = {
  likedNotes: string[];
  dislikedNotes: string[];
  likedFamilies: Family[];
  seasons: Season[];
  occasions: Daypart[];
  performance: { longevity?: "soft" | "moderate" | "strong"; projection?: "soft" | "moderate" | "strong" };
  budgetMax: number | null;
  /** Explicit only. "any" means marketing never filters results. */
  marketedFor: "any" | "men" | "women";
  /** Budget alternatives ("smells like a pricier fragrance") are included unless switched off. */
  includeAlternatives: boolean;
};

export const EMPTY_PREFERENCES: Preferences = {
  likedNotes: [],
  dislikedNotes: [],
  likedFamilies: [],
  seasons: [],
  occasions: [],
  performance: {},
  budgetMax: null,
  marketedFor: "any",
  includeAlternatives: true,
};

/**
 * How much each owned bottle says about taste. Ownership alone is weak evidence (PRD: "ownership
 * does not imply liking"), so an unrated bottle counts for little and a disliked one counts against.
 */
export const SENTIMENT_WEIGHT: Record<Sentiment | "unrated", number> = {
  love: 1,
  like: 0.7,
  neutral: 0.2,
  unrated: 0.15,
  dislike: -0.6,
};

export const sentimentWeight = (s: Sentiment | null) => SENTIMENT_WEIGHT[s ?? "unrated"];

export type AccordVector = Map<string, number>;

export function accordVector(f: Pick<Fragrance, "accords">): AccordVector {
  return new Map(f.accords.map((a) => [a.name, a.strength / 100]));
}

export function cosine(a: AccordVector, b: AccordVector): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const [k, v] of a) {
    na += v * v;
    const w = b.get(k);
    if (w) dot += v * w;
  }
  for (const v of b.values()) nb += v * v;
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

function addInto(target: AccordVector, v: AccordVector, w: number) {
  for (const [k, x] of v) target.set(k, (target.get(k) ?? 0) + x * w);
}

export type TasteProfile = {
  ownedCount: number;
  ratedCount: number;
  /** Families as share of owned bottles (0..1). Bottles with unknown family are left out. */
  familyShare: Record<Family, number>;
  familyCounts: Record<Family, number>;
  /** How well the collection covers each season, 0..1 (best single bottle's share relative to an all-season ideal). */
  seasonCoverage: Record<Season, number>;
  /** Count of bottles that suit each season. */
  seasonCounts: Record<Season, number>;
  daypartCounts: Record<Daypart, number>;
  /** Positive taste: accords weighted by sentiment (love > like > neutral > unrated). */
  likedAccords: AccordVector;
  /** Accords from bottles the user marked as disliked. */
  dislikedAccords: AccordVector;
  topAccords: { name: string; weight: number }[];
  topNotes: { name: string; count: number }[];
  /** True below five bottles or with no sentiment at all: the UI shows a limited-data caveat. */
  limited: boolean;
};

export function buildProfile(owned: OwnedFragrance[]): TasteProfile {
  const familyCounts = Object.fromEntries(FAMILIES.map((f) => [f, 0])) as Record<Family, number>;
  const seasonCounts = Object.fromEntries(SEASONS.map((s) => [s, 0])) as Record<Season, number>;
  const seasonBest = Object.fromEntries(SEASONS.map((s) => [s, 0])) as Record<Season, number>;
  const daypartCounts: Record<Daypart, number> = { day: 0, night: 0 };
  const likedAccords: AccordVector = new Map();
  const dislikedAccords: AccordVector = new Map();
  const noteCounts = new Map<string, number>();
  let known = 0;
  let rated = 0;

  for (const { fragrance: f, sentiment } of owned) {
    if (f.family) {
      familyCounts[f.family]++;
      known++;
    }
    if (sentiment) rated++;
    const shares = seasonShares(f);
    if (shares) {
      const max = Math.max(...Object.values(shares));
      for (const s of SEASONS) {
        if (shares[s] >= max * 0.6) seasonCounts[s]++;
        // A bottle whose votes are spread evenly (0.25 each) fully covers a season at share >= 0.25.
        seasonBest[s] = Math.max(seasonBest[s], Math.min(1, shares[s] / 0.25));
      }
    }
    const ds = dayShare(f);
    if (ds != null) {
      if (ds >= 0.42) daypartCounts.day++;
      if (ds <= 0.58) daypartCounts.night++;
    }
    const w = sentimentWeight(sentiment);
    const v = accordVector(f);
    if (w > 0) addInto(likedAccords, v, w);
    else addInto(dislikedAccords, v, -w);
    if (sentiment !== "dislike") for (const n of allNotes(f)) noteCounts.set(n.name, (noteCounts.get(n.name) ?? 0) + 1);
  }

  const familyShare = Object.fromEntries(FAMILIES.map((f) => [f, known ? familyCounts[f] / known : 0])) as Record<Family, number>;
  const topAccords = [...likedAccords.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, weight]) => ({ name, weight }));
  const topNotes = [...noteCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));

  return {
    ownedCount: owned.length,
    ratedCount: rated,
    familyShare,
    familyCounts,
    seasonCoverage: seasonBest,
    seasonCounts,
    daypartCounts,
    likedAccords,
    dislikedAccords,
    topAccords,
    topNotes,
    limited: owned.length < 5 || rated === 0,
  };
}

/** Plain-language summary for screen readers and the advisor's context. */
export function describeProfile(p: TasteProfile): string {
  if (p.ownedCount === 0) return "No fragrances in the collection yet.";
  const fams = Object.entries(p.familyCounts)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([f, n]) => `${n} ${f}`)
    .join(", ");
  const seasons = SEASONS.map((s) => `${s} ${p.seasonCounts[s]}`).join(", ");
  return `${p.ownedCount} bottles (${fams || "families unknown"}). Bottles suited to each season: ${seasons}. Day ${p.daypartCounts.day}, night ${p.daypartCounts.night}.`;
}

/** Bottles suited to each season × time-of-day cell (a bottle can count in several cells). */
export function coverageCells(owned: OwnedFragrance[]): Record<Season, Record<Daypart, number>> {
  const cells = Object.fromEntries(SEASONS.map((s) => [s, { day: 0, night: 0 }])) as Record<Season, Record<Daypart, number>>;
  for (const { fragrance } of owned) {
    const seasons = fitsSeasons(fragrance);
    const parts = fitsDayparts(fragrance);
    for (const s of seasons) for (const d of parts) cells[s][d]++;
  }
  return cells;
}

export function describeCoverage(cells: Record<Season, Record<Daypart, number>>): string {
  const empty: string[] = [];
  for (const s of SEASONS) for (const d of ["day", "night"] as const) if (cells[s][d] === 0) empty.push(`${s} ${d === "day" ? "daytime" : "evenings"}`);
  if (!empty.length) return "Every season is covered for both daytime and evening.";
  return `No bottles yet for ${empty.join(", ")}.`;
}
