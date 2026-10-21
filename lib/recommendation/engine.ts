import {
  adjustedRating,
  allNotes,
  dayShare,
  displayName,
  FAMILIES,
  PRICE_BAND_RANGE,
  seasonShares,
  SEASONS,
  type Daypart,
  type Family,
  type Fragrance,
  type Season,
} from "@/lib/domain/fragrance";
import {
  accordVector,
  buildProfile,
  cosine,
  sentimentWeight,
  type AccordVector,
  type OwnedFragrance,
  type Preferences,
  type TasteProfile,
} from "@/lib/domain/profile";

export const ENGINE_VERSION = "rec-1.0";

export const MODES = ["similar", "different", "gaps"] as const;
export type Mode = (typeof MODES)[number];

export type RecommendationRequest = {
  mode: Mode;
  budgetMax?: number | null;
  season?: Season | null;
  daypart?: Daypart | null;
  performance?: "soft" | "moderate" | "strong" | null;
  limit?: number;
};

/**
 * Initial weights from the PRD (preference 35, objective 25, budget 20, season/occasion 10,
 * performance 10). They're a starting hypothesis to be tuned against the eval set, not truth.
 */
export const WEIGHTS = { preference: 0.35, objective: 0.25, budget: 0.2, context: 0.1, performance: 0.1 } as const;

export type ReasonCode =
  | { code: "SIMILAR_TO_OWNED"; owned: string; similarity: number }
  | { code: "COMMUNITY_SAYS_SIMILAR"; owned: string; agree: number }
  | { code: "SHARES_ACCORDS"; accords: string[] }
  | { code: "MATCHES_LIKED_NOTES"; notes: string[] }
  | { code: "MATCHES_LIKED_FAMILY"; family: Family }
  | { code: "NEW_DIRECTION"; family: Family | null; maxOverlap: number }
  | { code: "FILLS_FAMILY_GAP"; family: Family; ownedCount: number }
  | { code: "FILLS_SEASON_GAP"; season: Season; ownedCount: number }
  | { code: "SUITS_SEASON"; season: Season }
  | { code: "SUITS_DAYPART"; daypart: Daypart }
  | { code: "WITHIN_BUDGET"; band: string }
  | { code: "PERFORMANCE_MATCH"; longevity: number }
  | { code: "WELL_RATED"; rating: number; votes: number };

export type CaveatCode =
  | { code: "PRICE_UNKNOWN" }
  | { code: "PRICE_ESTIMATED"; basis: string }
  | { code: "BUDGET_STRADDLES"; band: string }
  | { code: "FEW_VOTES"; votes: number }
  | { code: "OVERLAPS_OWNED"; owned: string; similarity: number }
  | { code: "RESEMBLES_DISLIKED"; owned: string; similarity: number }
  | { code: "NO_SEASON_DATA" }
  | { code: "LIMITED_PROFILE"; owned: number; rated: number }
  | { code: "NO_CLEAR_GAP" };

export type Recommendation = {
  fragranceId: string;
  fragrance: Fragrance;
  score: number;
  components: { preference: number; objective: number; budget: number; context: number; performance: number };
  reasons: ReasonCode[];
  caveats: CaveatCode[];
};

export type ExclusionCounts = { owned: number; dislikedNote: number; budget: number; season: number; daypart: number; lowQuality: number; tooSimilar: number };

export type RecommendationResult = {
  mode: Mode;
  engineVersion: string;
  results: Recommendation[];
  excluded: ExclusionCounts;
  /** The filter that removed the most candidates, so an empty state can offer a reversible relaxation. */
  mostRestrictive: keyof ExclusionCounts | null;
  globalCaveats: CaveatCode[];
  considered: number;
};

// Note matching tolerates provider spellings: "oud" also catches "Agarwood (Oud)" and "Oud Wood".
const NOTE_SYNONYMS: Record<string, string[]> = {
  oud: ["oud", "agarwood", "aoud"],
  vanilla: ["vanilla", "vanille"],
  patchouli: ["patchouli"],
  musk: ["musk"],
  rose: ["rose"],
  tobacco: ["tobacco"],
  leather: ["leather", "suede"],
  incense: ["incense", "olibanum", "frankincense"],
  coconut: ["coconut"],
  lavender: ["lavender", "lavandin"],
};

export function noteMatcher(note: string): (candidate: string) => boolean {
  const key = note.trim().toLowerCase();
  const terms = NOTE_SYNONYMS[key] ?? [key];
  return (candidate) => {
    const c = candidate.toLowerCase();
    return terms.some((t) => c === t || c.includes(t));
  };
}

/** Notes (and, for oud/leather/tobacco/vanilla, the matching accord) a fragrance contains from a list. */
export function matchingNotes(f: Fragrance, notes: string[]): string[] {
  const names = allNotes(f).map((n) => n.name);
  const accords = f.accords.filter((a) => a.strength >= 40).map((a) => a.name);
  return notes.filter((n) => {
    const m = noteMatcher(n);
    return names.some(m) || accords.some((a) => a === n.toLowerCase() || (NOTE_SYNONYMS[n.toLowerCase()] ?? []).includes(a));
  });
}

function budgetFit(f: Fragrance, budgetMax: number | null | undefined): { score: number; exclude: boolean; caveat?: CaveatCode; reason?: ReasonCode } {
  if (budgetMax == null) return { score: f.priceBand ? 0.8 : 0.6 };
  if (!f.priceBand) return { score: 0.5, exclude: false, caveat: { code: "PRICE_UNKNOWN" } };
  const [lo, hi] = PRICE_BAND_RANGE[f.priceBand];
  if (lo >= budgetMax) return { score: 0, exclude: true };
  if (hi <= budgetMax) return { score: 1, exclude: false, reason: { code: "WITHIN_BUDGET", band: f.priceBand } };
  return { score: 0.55, exclude: false, caveat: { code: "BUDGET_STRADDLES", band: f.priceBand } };
}

const PERFORMANCE_TARGET = { soft: 2.5, moderate: 3.4, strong: 4.1 } as const;

function performanceFit(f: Fragrance, want: "soft" | "moderate" | "strong" | null | undefined): number {
  const lon = f.community?.longevity;
  if (lon == null) return 0.5;
  if (!want) return Math.min(1, Math.max(0, (lon - 2) / 2.5)); // mild preference for lasting scents
  return Math.max(0, 1 - Math.abs(lon - PERFORMANCE_TARGET[want]) / 2);
}

function contextFit(f: Fragrance, season: Season | null | undefined, daypart: Daypart | null | undefined): number {
  const parts: number[] = [];
  const shares = seasonShares(f);
  if (season) parts.push(shares ? Math.min(1, shares[season] / 0.3) : 0.4);
  const ds = dayShare(f);
  if (daypart) parts.push(ds == null ? 0.4 : daypart === "day" ? Math.min(1, ds / 0.6) : Math.min(1, (1 - ds) / 0.6));
  if (!parts.length) return shares ? 0.7 : 0.5;
  return parts.reduce((a, b) => a + b, 0) / parts.length;
}

type OwnedFeature = { owned: OwnedFragrance; vector: AccordVector; weight: number };

/**
 * Deterministic, explainable ranking (Decision B in the case study). The AI advisor may phrase
 * these results, but it can't add candidates or change the scores.
 *
 * Pure function: same inputs → same output. Ties break on adjusted community rating, then id.
 */
export function recommendCandidates(
  request: RecommendationRequest,
  preferences: Preferences,
  owned: OwnedFragrance[],
  catalog: Fragrance[],
): RecommendationResult {
  const limit = Math.min(Math.max(request.limit ?? 5, 1), 10);
  const profile: TasteProfile = buildProfile(owned);
  const budgetMax = request.budgetMax ?? preferences.budgetMax;
  const season = request.season ?? null;
  const daypart = request.daypart ?? null;
  const performance = request.performance ?? preferences.performance.longevity ?? null;

  const ownedIds = new Set(owned.map((o) => o.fragrance.id));
  const ownedKeys = new Set(owned.map((o) => o.fragrance.canonicalKey));
  const ownedByExternal = new Map(owned.map((o) => [`${o.fragrance.provider}:${o.fragrance.externalId}`, o]));
  const features: OwnedFeature[] = owned.map((o) => ({ owned: o, vector: accordVector(o.fragrance), weight: sentimentWeight(o.sentiment) }));
  const liked = features.filter((f) => f.weight >= 0.5);
  // With nothing rated yet, "similar" falls back to every owned bottle (and says so via LIMITED_PROFILE).
  const similarAnchors = liked.length ? liked : features.filter((f) => f.weight > 0);
  const disliked = features.filter((f) => f.weight < 0);

  // Positive taste vector, plus explicitly liked families/notes from preferences.
  const taste: AccordVector = new Map(profile.likedAccords);
  const tasteHasSignal = taste.size > 0 || preferences.likedFamilies.length > 0 || preferences.likedNotes.length > 0;

  // Gap targets: a family is under-represented when it holds < half an even share among the families
  // the user leans toward (or the whole wheel if they've told us nothing); a season when at most
  // ~20% of bottles suit it. Never invent a gap (REC-03): below 3 bottles nothing counts as missing.
  const familyGap = new Map<Family, number>();
  const seasonGap = new Map<Season, number>();
  if (profile.ownedCount >= 3) {
    // Family gaps need a real shelf: with four bottles every absent family would look "missing".
    if (profile.ownedCount >= 5) {
      const pool = preferences.likedFamilies.length ? preferences.likedFamilies : FAMILIES;
      const even = 1 / pool.length;
      for (const fam of pool) {
        const share = profile.familyShare[fam];
        if (share < even * 0.5) familyGap.set(fam, (even - share) / even);
      }
    }
    for (const s of SEASONS) {
      const cov = profile.seasonCoverage[s];
      if (profile.seasonCounts[s] <= Math.max(1, Math.floor(profile.ownedCount * 0.2))) seasonGap.set(s, 1 - cov * 0.5);
    }
  }
  const noClearGap = request.mode === "gaps" && familyGap.size === 0 && seasonGap.size === 0;

  const excluded: ExclusionCounts = { owned: 0, dislikedNote: 0, budget: 0, season: 0, daypart: 0, lowQuality: 0, tooSimilar: 0 };
  const scored: Recommendation[] = [];

  for (const f of catalog) {
    // ── Eligibility (hard filters, all logged) ──
    if (ownedIds.has(f.id) || ownedKeys.has(f.canonicalKey)) {
      excluded.owned++;
      continue;
    }
    const votes = f.community?.votes ?? 0;
    if ((f.community?.rating ?? 0) < 3.4 || votes < 50) {
      excluded.lowQuality++;
      continue;
    }
    if (preferences.dislikedNotes.length && matchingNotes(f, preferences.dislikedNotes).length) {
      excluded.dislikedNote++;
      continue;
    }
    const budget = budgetFit(f, budgetMax);
    if (budget.exclude) {
      excluded.budget++;
      continue;
    }
    const shares = seasonShares(f);
    if (season && shares && shares[season] < 0.18) {
      excluded.season++;
      continue;
    }
    const ds = dayShare(f);
    if (daypart && ds != null && (daypart === "day" ? ds < 0.4 : ds > 0.6)) {
      excluded.daypart++;
      continue;
    }

    const v = accordVector(f);
    // Overlap with what's already on the shelf.
    let nearest: { f: OwnedFeature; s: number } | null = null;
    for (const o of features) {
      const s = cosine(v, o.vector);
      if (!nearest || s > nearest.s) nearest = { f: o, s };
    }
    const maxOverlap = nearest?.s ?? 0;
    // "Different" means different: a near-copy of an owned bottle is out, however well it fits.
    if (request.mode === "different" && maxOverlap >= 0.75) {
      excluded.tooSimilar++;
      continue;
    }
    const reasons: ReasonCode[] = [];
    const caveats: CaveatCode[] = [];

    // ── Preference fit ──
    // In Different mode accord-closeness to the shelf is exactly what we're moving away from, so
    // preference there comes only from explicit signals (liked families/notes, disliked bottles).
    let preference = request.mode === "different" || !tasteHasSignal ? 0.5 : cosine(v, taste);
    const likedNoteHits = preferences.likedNotes.length ? matchingNotes(f, preferences.likedNotes) : [];
    if (likedNoteHits.length) {
      preference = Math.min(1, preference + 0.12 * likedNoteHits.length);
      reasons.push({ code: "MATCHES_LIKED_NOTES", notes: likedNoteHits.slice(0, 3) });
    }
    if (f.family && preferences.likedFamilies.includes(f.family)) {
      preference = Math.min(1, preference + 0.1);
      reasons.push({ code: "MATCHES_LIKED_FAMILY", family: f.family });
    }
    if (profile.dislikedAccords.size) {
      const neg = cosine(v, profile.dislikedAccords);
      preference = Math.max(0, preference - 0.4 * neg);
    }
    for (const d of disliked) {
      const s = cosine(v, d.vector);
      if (s >= 0.85) caveats.push({ code: "RESEMBLES_DISLIKED", owned: displayName(d.owned.fragrance), similarity: round(s) });
    }


    // ── Mode objective ──
    let objective = 0;
    if (request.mode === "similar") {
      let best: { f: OwnedFeature; s: number } | null = null;
      for (const o of similarAnchors) {
        const s = cosine(v, o.vector) * (0.6 + 0.4 * Math.max(0, o.weight));
        if (!best || s > best.s) best = { f: o, s };
      }
      objective = best?.s ?? 0;
      if (best && best.s >= 0.55) {
        reasons.push({ code: "SIMILAR_TO_OWNED", owned: displayName(best.f.owned.fragrance), similarity: round(cosine(v, best.f.vector)) });
        const shared = sharedAccords(f, best.f.owned.fragrance);
        if (shared.length) reasons.push({ code: "SHARES_ACCORDS", accords: shared });
      }
      // Community "smells like" votes linking this candidate to a bottle the user likes.
      const edge = communityEdge(f, ownedByExternal, similarAnchors);
      if (edge) {
        objective = Math.min(1, objective + 0.15);
        reasons.push({ code: "COMMUNITY_SAYS_SIMILAR", owned: edge.owned, agree: edge.agree });
      }
    } else if (request.mode === "different") {
      objective = 1 - maxOverlap;
      if (objective >= 0.45) reasons.push({ code: "NEW_DIRECTION", family: f.family, maxOverlap: round(maxOverlap) });
      if (nearest && maxOverlap >= 0.6) caveats.push({ code: "OVERLAPS_OWNED", owned: displayName(nearest.f.owned.fragrance), similarity: round(maxOverlap) });
    } else {
      let fam = 0;
      if (f.family && familyGap.has(f.family)) {
        fam = familyGap.get(f.family)!;
        reasons.push({ code: "FILLS_FAMILY_GAP", family: f.family, ownedCount: profile.familyCounts[f.family] });
      }
      let sea = 0;
      let bestSeason: Season | null = null;
      if (shares) {
        for (const [s, gap] of seasonGap) {
          const val = gap * Math.min(1, shares[s] / 0.32);
          if (val > sea) {
            sea = val;
            bestSeason = s;
          }
        }
      }
      if (bestSeason && sea >= 0.5) reasons.push({ code: "FILLS_SEASON_GAP", season: bestSeason, ownedCount: profile.seasonCounts[bestSeason] });
      objective = noClearGap ? 1 - maxOverlap : Math.min(1, 0.6 * fam + 0.6 * sea);
      if (nearest && maxOverlap >= 0.8) caveats.push({ code: "OVERLAPS_OWNED", owned: displayName(nearest.f.owned.fragrance), similarity: round(maxOverlap) });
    }

    // ── Context, budget, performance ──
    const context = contextFit(f, season, daypart);
    if (season && shares && shares[season] >= 0.25) reasons.push({ code: "SUITS_SEASON", season });
    if (daypart && ds != null && (daypart === "day" ? ds >= 0.55 : ds <= 0.45)) reasons.push({ code: "SUITS_DAYPART", daypart });
    if (!shares) caveats.push({ code: "NO_SEASON_DATA" });
    if (budget.reason) reasons.push(budget.reason);
    if (budget.caveat) caveats.push(budget.caveat);
    if (f.priceBand && f.priceBasis?.startsWith("brand_tier")) caveats.push({ code: "PRICE_ESTIMATED", basis: f.priceBasis });
    const perf = performanceFit(f, performance);
    if (performance && perf >= 0.75 && f.community?.longevity) reasons.push({ code: "PERFORMANCE_MATCH", longevity: round(f.community.longevity) });
    if (votes < 300) caveats.push({ code: "FEW_VOTES", votes });
    const adj = adjustedRating(f);
    if (adj && adj >= 4.1 && f.community?.rating) reasons.push({ code: "WELL_RATED", rating: round(f.community.rating), votes });

    const components = { preference: round(preference), objective: round(objective), budget: round(budget.score), context: round(context), performance: round(perf) };
    const score =
      WEIGHTS.preference * preference +
      WEIGHTS.objective * objective +
      WEIGHTS.budget * budget.score +
      WEIGHTS.context * context +
      WEIGHTS.performance * perf +
      // Tie-breaker only (≤ 0.03): community confidence. Documented in DEC-08.
      0.03 * Math.max(0, Math.min(1, ((adj ?? 3.9) - 3.6) / 1));

    scored.push({ fragranceId: f.id, fragrance: f, score: round(score, 4), components, reasons, caveats });
  }

  scored.sort((a, b) => b.score - a.score || (adjustedRating(b.fragrance) ?? 0) - (adjustedRating(a.fragrance) ?? 0) || a.fragranceId.localeCompare(b.fragranceId));

  // Diversity: skip near-duplicates of an already chosen pick (e.g. EDT and EDP of the same line).
  const picked: Recommendation[] = [];
  for (const r of scored) {
    if (picked.length >= limit) break;
    const v = accordVector(r.fragrance);
    const dupe = picked.some((p) => cosine(v, accordVector(p.fragrance)) > 0.95 || sameLine(p.fragrance, r.fragrance));
    if (!dupe) picked.push(r);
  }

  const globalCaveats: CaveatCode[] = [];
  if (profile.limited) globalCaveats.push({ code: "LIMITED_PROFILE", owned: profile.ownedCount, rated: profile.ratedCount });
  if (noClearGap) globalCaveats.push({ code: "NO_CLEAR_GAP" });

  const entries = Object.entries(excluded).filter(([k]) => k !== "owned" && k !== "lowQuality" && k !== "tooSimilar") as [keyof ExclusionCounts, number][];
  const top = entries.sort((a, b) => b[1] - a[1])[0];
  return {
    mode: request.mode,
    engineVersion: ENGINE_VERSION,
    results: picked,
    excluded,
    mostRestrictive: top && top[1] > 0 ? top[0] : null,
    globalCaveats,
    considered: catalog.length,
  };
}

function sharedAccords(a: Fragrance, b: Fragrance): string[] {
  const strong = (f: Fragrance) => new Set(f.accords.filter((x) => x.strength >= 45).map((x) => x.name));
  const sb = strong(b);
  return [...strong(a)].filter((x) => sb.has(x)).slice(0, 3);
}

function communityEdge(f: Fragrance, ownedByExternal: Map<string, OwnedFragrance>, anchors: OwnedFeature[]): { owned: string; agree: number } | null {
  const anchorIds = new Set(anchors.map((a) => a.owned.fragrance.id));
  // Edges stored on the candidate…
  for (const e of f.similarTo) {
    const o = ownedByExternal.get(`${f.provider}:${e.externalId}`);
    if (o && anchorIds.has(o.fragrance.id) && e.agree >= 50) return { owned: displayName(o.fragrance), agree: e.agree };
  }
  // …and edges stored on the owned bottle pointing at the candidate.
  for (const a of anchors) {
    const e = a.owned.fragrance.similarTo.find((x) => x.externalId === f.externalId && a.owned.fragrance.provider === f.provider);
    if (e && e.agree >= 50) return { owned: displayName(a.owned.fragrance), agree: e.agree };
  }
  return null;
}

function sameLine(a: Fragrance, b: Fragrance): boolean {
  if (a.brand !== b.brand) return false;
  const stem = (n: string) => n.toLowerCase().replace(/\b(eau de (parfum|toilette|cologne)|edp|edt|parfum|extrait|elixir|intense|absolu|le parfum)\b/g, "").trim();
  return stem(a.name) === stem(b.name) && stem(a.name).length > 0;
}

function round(n: number, dp = 3) {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

