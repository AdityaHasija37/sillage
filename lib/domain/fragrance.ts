import { z } from "zod";

export const FAMILIES = ["citrus", "aromatic", "aquatic", "green", "floral", "woody", "amber", "gourmand", "leather", "chypre"] as const;
export type Family = (typeof FAMILIES)[number];

export const CONCENTRATIONS = ["EDC", "EDT", "EDP", "Parfum", "Extrait", "Elixir", "Cologne"] as const;
export type Concentration = (typeof CONCENTRATIONS)[number];

export const SEASONS = ["spring", "summer", "fall", "winter"] as const;
export type Season = (typeof SEASONS)[number];

export const DAYPARTS = ["day", "night"] as const;
export type Daypart = (typeof DAYPARTS)[number];

export const PRICE_BANDS = ["under_50", "50_100", "100_200", "200_plus"] as const;
export type PriceBand = (typeof PRICE_BANDS)[number];

/** Inclusive USD range a band stands for. 200_plus is open-ended. */
export const PRICE_BAND_RANGE: Record<PriceBand, [number, number]> = {
  under_50: [0, 50],
  "50_100": [50, 100],
  "100_200": [100, 200],
  "200_plus": [200, Infinity],
};

export const PRICE_BAND_LABEL: Record<PriceBand, string> = {
  under_50: "Under $50",
  "50_100": "$50–100",
  "100_200": "$100–200",
  "200_plus": "$200+",
};

export const FAMILY_LABEL: Record<Family, string> = {
  citrus: "Citrus",
  aromatic: "Aromatic",
  aquatic: "Aquatic",
  green: "Green",
  floral: "Floral",
  woody: "Woody",
  amber: "Amber",
  gourmand: "Gourmand",
  leather: "Leather",
  chypre: "Chypre",
};

const Note = z.object({ name: z.string(), weight: z.number() });
const Accord = z.object({ name: z.string(), strength: z.number() });
const Theme = z.object({ text: z.string(), agree: z.number(), disagree: z.number() });

export const Community = z.object({
  rating: z.number().nullable(),
  votes: z.number(),
  longevity: z.number().nullable(),
  sillage: z.number().nullable(),
  priceValue: z.number().nullable(),
  have: z.number().nullable(),
  had: z.number().nullable(),
  want: z.number().nullable(),
  seasons: z.object({ winter: z.number().nullable(), spring: z.number().nullable(), summer: z.number().nullable(), fall: z.number().nullable() }),
  daypart: z.object({ day: z.number().nullable(), night: z.number().nullable() }),
});
export type Community = z.infer<typeof Community>;

/** A row from `public.fragrances`, validated at the DB boundary. Provider JSON never leaks past here. */
export const FragranceRow = z.object({
  id: z.string().uuid(),
  provider: z.string(),
  external_id: z.string(),
  brand: z.string(),
  name: z.string(),
  canonical_key: z.string(),
  year: z.number().nullable(),
  gender: z.enum(["male", "female", "unisex"]).nullable(),
  family: z.enum(FAMILIES).nullable(),
  family_label: z.string().nullable(),
  concentration: z.enum(CONCENTRATIONS).nullable(),
  concentration_basis: z.string().nullable(),
  sizes_ml: z.array(z.coerce.number()),
  perfumers: z.array(z.string()),
  accords: z.array(Accord),
  notes: z.object({ top: z.array(Note), middle: z.array(Note), base: z.array(Note), flat: z.array(Note) }),
  community: Community.nullable(),
  themes: z.object({ pros: z.array(Theme), cons: z.array(Theme) }),
  similar_to: z.array(z.object({ externalId: z.string(), agree: z.number(), disagree: z.number() })),
  alternative_to: z.object({ externalId: z.string(), name: z.string(), agree: z.number() }).nullable(),
  popularity: z.coerce.number(),
  price_band: z.enum(PRICE_BANDS).nullable(),
  price_basis: z.string().nullable(),
  brand_tier: z.string().nullable(),
  image_url: z.string().nullable(),
  source_url: z.string().nullable(),
  metadata_quality: z.enum(["verified", "partial", "unverified"]),
});
export type FragranceRow = z.infer<typeof FragranceRow>;

export type Fragrance = {
  id: string;
  provider: string;
  externalId: string;
  brand: string;
  name: string;
  canonicalKey: string;
  year: number | null;
  gender: "male" | "female" | "unisex" | null;
  family: Family | null;
  familyLabel: string | null;
  concentration: Concentration | null;
  concentrationBasis: string | null;
  sizesMl: number[];
  perfumers: string[];
  accords: { name: string; strength: number }[];
  notes: { top: { name: string; weight: number }[]; middle: { name: string; weight: number }[]; base: { name: string; weight: number }[]; flat: { name: string; weight: number }[] };
  community: Community | null;
  themes: { pros: { text: string; agree: number; disagree: number }[]; cons: { text: string; agree: number; disagree: number }[] };
  similarTo: { externalId: string; agree: number; disagree: number }[];
  /** Set when the community strongly says this smells like a fragrance in a higher price band. */
  alternativeTo: { externalId: string; name: string; agree: number } | null;
  popularity: number;
  priceBand: PriceBand | null;
  priceBasis: string | null;
  brandTier: string | null;
  imageUrl: string | null;
  sourceUrl: string | null;
  dataQuality: "verified" | "partial" | "unverified";
};

export const FRAGRANCE_COLUMNS =
  "id, provider, external_id, brand, name, canonical_key, year, gender, family, family_label, concentration, concentration_basis, sizes_ml, perfumers, accords, notes, community, themes, similar_to, alternative_to, popularity, price_band, price_basis, brand_tier, image_url, source_url, metadata_quality";

export function toFragrance(raw: unknown): Fragrance {
  const r = FragranceRow.parse(raw);
  return {
    id: r.id,
    provider: r.provider,
    externalId: r.external_id,
    brand: r.brand,
    name: r.name,
    canonicalKey: r.canonical_key,
    year: r.year,
    gender: r.gender,
    family: r.family,
    familyLabel: r.family_label,
    concentration: r.concentration,
    concentrationBasis: r.concentration_basis,
    sizesMl: r.sizes_ml,
    perfumers: r.perfumers,
    accords: r.accords,
    notes: r.notes,
    community: r.community,
    themes: r.themes,
    similarTo: r.similar_to,
    alternativeTo: r.alternative_to,
    popularity: r.popularity,
    priceBand: r.price_band,
    priceBasis: r.price_basis,
    brandTier: r.brand_tier,
    imageUrl: r.image_url,
    sourceUrl: r.source_url,
    dataQuality: r.metadata_quality,
  };
}

export function allNotes(f: Pick<Fragrance, "notes">): { name: string; weight: number }[] {
  return [...f.notes.top, ...f.notes.middle, ...f.notes.base, ...f.notes.flat];
}

/** Share of community season votes, 0..1 each; null when nobody voted. */
export function seasonShares(f: Pick<Fragrance, "community">): Record<Season, number> | null {
  const s = f.community?.seasons;
  if (!s) return null;
  const v = { spring: s.spring ?? 0, summer: s.summer ?? 0, fall: s.fall ?? 0, winter: s.winter ?? 0 };
  const total = v.spring + v.summer + v.fall + v.winter;
  if (total <= 0) return null;
  return { spring: v.spring / total, summer: v.summer / total, fall: v.fall / total, winter: v.winter / total };
}

/** A season "fits" when it gets at least 60% of the votes of the fragrance's strongest season. */
export function fitsSeasons(f: Pick<Fragrance, "community">): Season[] {
  const shares = seasonShares(f);
  if (!shares) return [];
  const max = Math.max(...Object.values(shares));
  return SEASONS.filter((s) => shares[s] >= max * 0.6);
}

/** Day share of day/night votes, 0..1; null when nobody voted. */
export function dayShare(f: Pick<Fragrance, "community">): number | null {
  const d = f.community?.daypart;
  if (!d) return null;
  const total = (d.day ?? 0) + (d.night ?? 0);
  return total > 0 ? (d.day ?? 0) / total : null;
}

export function fitsDayparts(f: Pick<Fragrance, "community">): Daypart[] {
  const share = dayShare(f);
  if (share == null) return [];
  if (share >= 0.58) return ["day"];
  if (share <= 0.42) return ["night"];
  return ["day", "night"];
}

/** Bayesian-adjusted rating so a 4.6 from 40 votes doesn't outrank a 4.3 from 30,000. */
export function adjustedRating(f: Pick<Fragrance, "community">, prior = 3.9, weight = 500): number | null {
  const c = f.community;
  if (!c?.rating || !c.votes) return null;
  return (c.rating * c.votes + prior * weight) / (c.votes + weight);
}

export function displayName(f: Pick<Fragrance, "brand" | "name">): string {
  return `${f.brand} ${f.name}`;
}
