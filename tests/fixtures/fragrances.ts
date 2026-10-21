import type { Family, Fragrance, PriceBand } from "@/lib/domain/fragrance";
import type { OwnedFragrance, Sentiment } from "@/lib/domain/profile";

let counter = 0;

type Spec = {
  id?: string;
  brand?: string;
  name: string;
  family?: Family | null;
  accords: Record<string, number>;
  notes?: string[];
  seasons?: { spring: number; summer: number; fall: number; winter: number } | null;
  day?: number;
  night?: number;
  priceBand?: PriceBand | null;
  priceBasis?: string | null;
  rating?: number;
  votes?: number;
  longevity?: number;
  externalId?: string;
  similarTo?: { externalId: string; agree: number; disagree: number }[];
};

/** Synthetic fragrance for deterministic tests. Not real catalog data. */
export function frag(spec: Spec): Fragrance {
  counter++;
  const id = spec.id ?? `00000000-0000-4000-8000-${String(counter).padStart(12, "0")}`;
  const brand = spec.brand ?? "Fixture House";
  return {
    id,
    provider: "fixture",
    externalId: spec.externalId ?? `fx-${counter}`,
    brand,
    name: spec.name,
    canonicalKey: `${brand.toLowerCase()}::${spec.name.toLowerCase()}`,
    year: 2020,
    gender: "unisex",
    family: spec.family === undefined ? null : spec.family,
    familyLabel: null,
    concentration: "EDP",
    concentrationBasis: "provider",
    sizesMl: [50, 100],
    perfumers: [],
    accords: Object.entries(spec.accords)
      .map(([name, strength]) => ({ name, strength }))
      .sort((a, b) => b.strength - a.strength),
    notes: { top: [], middle: (spec.notes ?? []).map((name) => ({ name, weight: 50 })), base: [], flat: [] },
    community: {
      rating: spec.rating ?? 4.1,
      votes: spec.votes ?? 2000,
      longevity: spec.longevity ?? 3.5,
      sillage: 2.5,
      priceValue: 3,
      have: 100,
      had: 10,
      want: 100,
      seasons: spec.seasons === null ? { spring: null, summer: null, fall: null, winter: null } : (spec.seasons ?? { spring: 25, summer: 25, fall: 25, winter: 25 }),
      daypart: { day: spec.day ?? 50, night: spec.night ?? 50 },
    },
    themes: { pros: [], cons: [] },
    similarTo: spec.similarTo ?? [],
    popularity: 1000,
    priceBand: spec.priceBand === undefined ? "50_100" : spec.priceBand,
    priceBasis: spec.priceBasis ?? null,
    brandTier: null,
    imageUrl: null,
    sourceUrl: null,
    dataQuality: "partial",
  };
}

export const own = (fragrance: Fragrance, sentiment: Sentiment | null = null, rating: number | null = null): OwnedFragrance => ({ fragrance, sentiment, rating });

const SUMMER = { spring: 30, summer: 50, fall: 15, winter: 5 };
const WINTER = { spring: 5, summer: 2, fall: 38, winter: 55 };

/** A small catalog with clearly separated styles, used by the REC-* tests. */
export function fixtureCatalog() {
  const freshCitrus = frag({ name: "Citrus Sport", family: "citrus", accords: { citrus: 100, fresh: 80, aromatic: 50 }, notes: ["Bergamot", "Lemon"], seasons: SUMMER, day: 80, night: 20 });
  const freshAquatic = frag({ name: "Blue Tide", brand: "House B", family: "aquatic", accords: { aquatic: 100, fresh: 85, citrus: 55 }, notes: ["Sea Notes", "Grapefruit"], seasons: SUMMER, day: 75, night: 25 });
  const freshSimilar = frag({ name: "Citrus Sport Intense Cousin", brand: "Other House", family: "citrus", accords: { citrus: 100, fresh: 75, aromatic: 55, woody: 20 }, notes: ["Bergamot", "Lime"], seasons: SUMMER, day: 78, night: 22 });
  const woodyOud = frag({ name: "Royal Oud", brand: "House C", family: "woody", accords: { oud: 100, woody: 85, smoky: 50 }, notes: ["Agarwood (Oud)", "Saffron"], seasons: WINTER, day: 30, night: 70, priceBand: "200_plus" });
  const woodyClean = frag({ name: "Cedar Walk", brand: "House D", family: "woody", accords: { woody: 100, cedar: 70, aromatic: 40 }, notes: ["Cedar", "Vetiver"], seasons: { spring: 25, summer: 15, fall: 35, winter: 25 }, day: 55, night: 45, priceBand: "under_50" });
  const amberVanilla = frag({ name: "Amber Nights", brand: "House E", family: "amber", accords: { amber: 100, vanilla: 80, "warm spicy": 60 }, notes: ["Vanilla", "Tonka Bean", "Cinnamon"], seasons: WINTER, day: 20, night: 80, priceBand: "100_200" });
  const gourmand = frag({ name: "Caramel Cloud", brand: "House F", family: "gourmand", accords: { sweet: 100, vanilla: 85, caramel: 60 }, notes: ["Caramel", "Vanilla"], seasons: WINTER, day: 35, night: 65, priceBand: "50_100" });
  const floralRose = frag({ name: "Rose Garden", brand: "House G", family: "floral", accords: { rose: 100, floral: 90, fresh: 30 }, notes: ["Rose", "Peony"], seasons: { spring: 45, summer: 30, fall: 15, winter: 10 }, day: 70, night: 30 });
  const leather = frag({ name: "Saddle", brand: "House H", family: "leather", accords: { leather: 100, smoky: 60, woody: 50 }, notes: ["Leather", "Birch"], seasons: WINTER, day: 40, night: 60, priceBand: "100_200" });
  const lowRated = frag({ name: "Unloved Citrus", brand: "House I", family: "citrus", accords: { citrus: 100, fresh: 80 }, rating: 2.9 });
  const tobaccoOudFree = frag({ name: "Tobacco Leaf", brand: "House J", family: "amber", accords: { tobacco: 100, amber: 70, woody: 50 }, notes: ["Tobacco", "Honey"], seasons: WINTER, day: 25, night: 75, priceBand: "50_100" });
  return { freshCitrus, freshAquatic, freshSimilar, woodyOud, woodyClean, amberVanilla, gourmand, floralRose, leather, lowRated, tobaccoOudFree };
}
