import { allNotes, dayShare, seasonShares, SEASONS, type Fragrance, type Season } from "@/lib/domain/fragrance";

/** PRD 08 §4.1 normalized profile, adapted to Sillage's data (see docs/INTELLIGENCE-PLAN.md). */
export const OCCASIONS = ["casual", "office", "formal", "evening", "special"] as const;
export type Occasion = (typeof OCCASIONS)[number];
export const OCCASION_LABEL: Record<Occasion, string> = { casual: "Daily & casual", office: "Office", formal: "Formal", evening: "Evening & date", special: "Special events" };

export type Intensity = "soft" | "moderate" | "strong";
export type Provenance = "catalog" | "community" | "inferred";

export type FragranceProfile = {
  id: string;
  brand: string;
  name: string;
  canonicalKey: string;
  families: string[];
  accords: { tag: string; strength: number }[];
  notes: { top: string[]; middle: string[]; base: string[] };
  /** Relative season suitability 0..1 (each season's votes over the strongest season's). */
  seasonalFit?: Record<Season, number>;
  daypartFit?: { day: number; night: number };
  /** Inferred from day/night share, projection and accords. Never sourced. */
  occasionFit?: Record<Occasion, number>;
  intensity?: Intensity;
  /** Community projection 0..1 (sillage votes 1–4 rescaled) and longevity 0..1 (1–5 rescaled). */
  projection?: number;
  longevity?: number;
  provenance: Partial<Record<"accords" | "notes" | "seasonalFit" | "daypartFit" | "occasionFit" | "intensity" | "families", Provenance>>;
  /** Share of the six core fields that are present (accords, notes, families, seasons, day/night, intensity). */
  completeness: number;
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

const FRESH = ["citrus", "fresh", "aquatic", "marine", "ozonic", "green", "aromatic", "fresh spicy", "herbal", "lavender"];
const WARM = ["amber", "vanilla", "sweet", "warm spicy", "gourmand", "tobacco", "oud", "caramel", "honey", "boozy", "cacao", "coffee", "balsamic", "rum"];
const REFINED = ["woody", "iris", "powdery", "leather", "mossy", "rose", "white floral", "sandalwood", "vetiver", "patchouli", "smoky", "incense", "earthy"];

export function groupStrength(p: Pick<FragranceProfile, "accords">, group: string[]): number {
  let best = 0;
  for (const a of p.accords) if (group.includes(a.tag)) best = Math.max(best, a.strength);
  return best;
}

export function toProfile(f: Fragrance): FragranceProfile {
  const accords = f.accords.map((a) => ({ tag: a.name.toLowerCase(), strength: clamp01(a.strength / 100) }));
  const notes = {
    top: f.notes.top.map((n) => n.name),
    middle: [...f.notes.middle, ...f.notes.flat].map((n) => n.name),
    base: f.notes.base.map((n) => n.name),
  };
  const families = [...new Set([f.family, ...(f.familyLabel ?? "").split(/\s+/)].filter((x): x is string => !!x && x.length > 2))];
  const provenance: FragranceProfile["provenance"] = {};
  if (accords.length) provenance.accords = "community";
  if (allNotes(f).length) provenance.notes = "community";
  if (families.length) provenance.families = "catalog";

  let seasonalFit: FragranceProfile["seasonalFit"];
  const shares = seasonShares(f);
  if (shares) {
    const max = Math.max(...SEASONS.map((s) => shares[s]));
    seasonalFit = Object.fromEntries(SEASONS.map((s) => [s, max > 0 ? clamp01(shares[s] / max) : 0])) as Record<Season, number>;
    provenance.seasonalFit = "community";
  }
  let daypartFit: FragranceProfile["daypartFit"];
  const ds = dayShare(f);
  if (ds != null) {
    daypartFit = { day: clamp01(ds / 0.6), night: clamp01((1 - ds) / 0.6) };
    provenance.daypartFit = "community";
  }
  const sil = f.community?.sillage;
  const lon = f.community?.longevity;
  const projection = sil != null ? clamp01((sil - 1) / 3) : undefined;
  const longevity = lon != null ? clamp01((lon - 1) / 4) : undefined;
  let intensity: Intensity | undefined;
  if (projection != null || longevity != null) {
    const v = 0.6 * (projection ?? longevity!) + 0.4 * (longevity ?? projection!);
    intensity = v < 0.42 ? "soft" : v < 0.62 ? "moderate" : "strong";
    provenance.intensity = "community";
  }

  const base: FragranceProfile = {
    id: f.id,
    brand: f.brand,
    name: f.name,
    canonicalKey: f.canonicalKey,
    families,
    accords,
    notes,
    seasonalFit,
    daypartFit,
    intensity,
    projection,
    longevity,
    provenance,
    completeness: 0,
  };
  base.occasionFit = inferOccasions(base, ds);
  if (base.occasionFit) provenance.occasionFit = "inferred";
  const present = [accords.length > 0, allNotes(f).length > 0, families.length > 0, !!seasonalFit, !!daypartFit, !!intensity].filter(Boolean).length;
  base.completeness = Math.round((present / 6) * 100) / 100;
  return base;
}

/**
 * Occasion suitability is not in the data, so it's inferred (DEC-34) from how wearers use it by day
 * or night, how far it projects, and whether its character is fresh, warm or refined. Without
 * day/night votes and accords it's left missing rather than guessed.
 */
export function inferOccasions(p: Pick<FragranceProfile, "accords" | "projection" | "longevity">, ds: number | null): Record<Occasion, number> | undefined {
  if (ds == null || p.accords.length === 0) return undefined;
  const fresh = groupStrength(p, FRESH);
  const warm = groupStrength(p, WARM);
  const refined = groupStrength(p, REFINED);
  const sil = p.projection ?? 0.5;
  const lon = p.longevity ?? 0.5;
  const night = 1 - ds;
  return {
    casual: clamp01(0.45 * ds + 0.35 * fresh + 0.2 * (1 - sil)),
    office: clamp01(0.4 * ds + 0.25 * (1 - sil) + 0.2 * Math.max(fresh, refined) + 0.15 * (1 - warm)),
    formal: clamp01(0.4 * refined + 0.25 * night + 0.2 * (1 - Math.abs(sil - 0.5) * 2) + 0.15 * warm),
    evening: clamp01(0.4 * night + 0.3 * warm + 0.3 * sil),
    special: clamp01(0.35 * night + 0.25 * sil + 0.2 * lon + 0.2 * Math.max(warm, refined)),
  };
}

/** Weighted Jaccard on accord strengths (60%) and Jaccard on families (40%); renormalised if one is missing. */
export function similarity(a: FragranceProfile, b: FragranceProfile): number {
  const parts: [number, number][] = [];
  if (a.accords.length && b.accords.length) {
    const tags = new Set([...a.accords.map((x) => x.tag), ...b.accords.map((x) => x.tag)]);
    let min = 0;
    let max = 0;
    for (const t of tags) {
      const x = a.accords.find((v) => v.tag === t)?.strength ?? 0;
      const y = b.accords.find((v) => v.tag === t)?.strength ?? 0;
      min += Math.min(x, y);
      max += Math.max(x, y);
    }
    parts.push([0.6, max ? min / max : 0]);
  }
  if (a.families.length && b.families.length) {
    const fa = new Set(a.families);
    const fb = new Set(b.families);
    const inter = [...fa].filter((x) => fb.has(x)).length;
    const union = new Set([...fa, ...fb]).size;
    parts.push([0.4, union ? inter / union : 0]);
  }
  const w = parts.reduce((s, [x]) => s + x, 0);
  return w ? parts.reduce((s, [x, v]) => s + x * v, 0) / w : 0;
}

export const FRESH_ACCORDS = FRESH;
export const WARM_ACCORDS = WARM;
export const REFINED_ACCORDS = REFINED;
