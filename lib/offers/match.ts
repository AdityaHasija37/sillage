import type { Concentration } from "@/lib/domain/fragrance";

/** What the user selected on the detail page: the exact bottle they want priced. */
export type OfferTarget = { brand: string; name: string; concentration: Concentration; sizeMl: number };

/** A listing as returned by a provider, before any matching. */
export type RawListing = {
  provider: "serpapi_google_shopping" | "sample";
  merchant: string;
  title: string;
  url: string;
  listPrice: number;
  shippingPrice: number | null;
  taxPrice: number | null;
  availability: string | null;
  currency: string;
};

export type MatchStatus = "exact" | "probable" | "rejected";
export type MatchReason =
  | "brand_missing"
  | "name_missing"
  | "different_edition"
  | "concentration_mismatch"
  | "concentration_unstated"
  | "size_mismatch"
  | "size_unstated"
  | "not_new_full_bottle"
  | "multi_item_set"
  | "unrecognised_words"
  | "unsafe_url"
  | "non_usd"
  | "duplicate";

export type MatchedOffer = RawListing & {
  status: MatchStatus;
  reasons: MatchReason[];
  parsed: { concentration: Concentration | null; sizeMl: number | null; condition: string | null };
};

const norm = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const CONCENTRATION_PATTERNS: [RegExp, Concentration][] = [
  [/\bextrait\b/, "Extrait"],
  [/\belixir\b/, "Elixir"],
  [/\beau de parfum\b|\bedp\b/, "EDP"],
  [/\beau de toilette\b|\bedt\b/, "EDT"],
  [/\beau de cologne\b|\bedc\b/, "EDC"],
  [/\bparfum\b/, "Parfum"],
  [/\bcologne\b/, "Cologne"],
];

export function parseConcentration(title: string): Concentration | null {
  const t = norm(title);
  for (const [re, c] of CONCENTRATION_PATTERNS) if (re.test(t)) return c;
  return null;
}

// US listings mostly quote fluid ounces; bottles are sold in standard metric sizes.
const OZ_TO_ML: [number, number][] = [
  [0.17, 5], [0.33, 10], [0.5, 15], [0.68, 20], [1, 30], [1.2, 35], [1.3, 40], [1.6, 50], [1.7, 50], [2, 60], [2.5, 75], [2.7, 80],
  [3, 90], [3.04, 90], [3.3, 100], [3.4, 100], [3.38, 100], [4, 120], [4.1, 125], [4.2, 125], [5, 150], [5.1, 150], [6.7, 200], [6.8, 200], [8.4, 250], [10, 300],
];

export function parseSizeMl(title: string): number | null {
  const t = title.toLowerCase().replace(",", ".");
  const ml = /(\d{1,3}(?:\.\d)?)\s*-?\s*ml\b/.exec(t);
  if (ml) return Number(ml[1]);
  const oz = /(\d{1,2}(?:\.\d{1,2})?)\s*-?\s*(?:fl\.?\s*)?oz\b/.exec(t);
  if (oz) {
    const v = Number(oz[1]);
    const hit = OZ_TO_ML.find(([o]) => Math.abs(o - v) < 0.051);
    return hit ? hit[1] : Math.round(v * 29.5735);
  }
  return null;
}

// Words that mark a flanker or special edition when they're not part of the target's own name.
const EDITION_WORDS = [
  "intense", "elixir", "absolu", "absolute", "extreme", "sport", "noir", "night", "nuit", "le parfum", "eau fraiche", "fraiche", "prive", "limited",
  "edition", "collector", "summer", "fresh", "aqua", "acqua", "blue", "bleu", "black", "gold", "platinum", "silver", "red", "rouge", "pink", "oud",
  "leather", "tobacco", "velvet", "royal", "exclusif", "extrait", "concentree", "profondo", "profumo", "parfum intense",
  "into the wild", "eau forte", "very cool", "in black", "eclat", "electric", "edge", "fever", "glow", "rush", "infinite",
];
const CONDITION_WORDS: [RegExp, string][] = [
  [/\btester\b|\btstr\b/, "tester"],
  [/\bunboxed\b|\bno box\b|\bwithout box\b/, "unboxed"],
  [/\bsample\b|\bvial\b|\bdecant\b|\bdecanted\b/, "sample"],
  [/\bmini\b|\bminiature\b|\btravel\b|\brollerball\b|\broller\b|\bpurse spray\b/, "travel size"],
  [/\brefill\b/, "refill"],
  [/\bused\b|\bpre owned\b|\bpartial\b|\bopen box\b/, "used"],
  [/\bbody (lotion|wash|spray|mist)\b|\bdeodorant\b|\bshower gel\b|\bafter ?shave\b|\bhair mist\b/, "different product"],
];
// Retail filler that never changes which bottle it is. Brand aliases cover common listing variants.
const GENERIC_WORDS = new Set([
  "eau", "de", "du", "parfum", "toilette", "cologne", "edp", "edt", "edc", "spray", "vaporisateur", "vapo", "natural", "for", "men", "man", "mens", "men s",
  "women", "woman", "womens", "her", "him", "his", "pour", "homme", "femme", "unisex", "fragrance", "perfume", "fl", "oz", "ml", "new", "sealed", "in", "box",
  "boxed", "authentic", "original", "genuine", "the", "and", "by", "a", "s", "with", "x", "christian", "chanel", "ysl", "giorgio", "armani", "paco", "rabanne",
  "lancome", "lancôme", "perfumes", "paris", "london", "new york", "milano", "jpg", "dg", "d", "g", "le", "la", "l",
]);

const SET_PATTERN = /\bgift set\b|\bset of\b|\b\d\s*pc\b|\b\d\s*piece\b|\bcoffret\b|\bbundle\b|\bkit\b|\bduo\b|\btrio\b|\b\d\s*x\s*\d/;

/**
 * Deterministic variant-aware matching (Decision D). A listing is "exact" only when brand, name,
 * concentration and size all match and it's a new, full, single bottle. Anything stated
 * differently is rejected; anything merely unstated is "probable" (shown as Needs verification).
 */
export function matchListing(target: OfferTarget, listing: RawListing): MatchedOffer {
  const t = norm(listing.title);
  const reasons: MatchReason[] = [];
  const concentration = parseConcentration(listing.title);
  const sizeMl = parseSizeMl(listing.title);
  let condition: string | null = null;

  if (!/^https:\/\/[^\s/$.?#].[^\s]*$/i.test(listing.url)) reasons.push("unsafe_url");
  if (listing.currency !== "USD") reasons.push("non_usd");

  const brand = norm(target.brand);
  if (!t.includes(brand) && !t.includes(brand.replace(/ /g, ""))) reasons.push("brand_missing");

  const name = norm(target.name);
  const nameTokens = name.split(" ").filter((w) => w.length > 1 || /\d/.test(w));
  if (!nameTokens.every((w) => new RegExp(`\\b${escapeRe(w)}\\b`).test(t))) reasons.push("name_missing");

  const own = ` ${norm(target.brand)} ${name} `;
  // Anything left after removing the target's own words and known retail filler might be a flanker
  // ("Qahwa", "Lucky", "Intensement"), so it can't be an exact match: v1's blocklist missed these.
  const leftovers = t
    .split(" ")
    .filter((w) => w && !own.includes(` ${w} `) && !GENERIC_WORDS.has(w) && !/^\d+(\.\d+)?(ml|oz)?$/.test(w));
  const titleWithoutTarget = ` ${t} `.replace(` ${name} `, " ");
  const edition = EDITION_WORDS.find((w) => {
    const re = new RegExp(`(^| )${escapeRe(w)}( |$)`);
    return re.test(titleWithoutTarget) && !re.test(own) && !isConcentrationWord(w, target.concentration);
  });
  if (edition) reasons.push("different_edition");

  for (const [re, label] of CONDITION_WORDS) {
    if (re.test(t)) {
      condition = label;
      reasons.push("not_new_full_bottle");
      break;
    }
  }
  if (SET_PATTERN.test(t)) reasons.push("multi_item_set");

  if (concentration == null) reasons.push("concentration_unstated");
  else if (concentration !== target.concentration) reasons.push("concentration_mismatch");

  if (leftovers.length && !reasons.includes("different_edition") && !reasons.includes("not_new_full_bottle")) reasons.push("unrecognised_words");
  if (sizeMl == null) reasons.push("size_unstated");
  else if (Math.abs(sizeMl - target.sizeMl) > 1) reasons.push("size_mismatch");

  const hard: MatchReason[] = ["unsafe_url", "non_usd", "brand_missing", "name_missing", "different_edition", "concentration_mismatch", "size_mismatch", "not_new_full_bottle", "multi_item_set"];
  const status: MatchStatus = reasons.some((r) => hard.includes(r)) ? "rejected" : reasons.length ? "probable" : "exact";
  return { ...listing, status, reasons, parsed: { concentration, sizeMl, condition } };
}

// "Elixir"/"Extrait" are concentrations as well as edition words; don't double-penalise them.
function isConcentrationWord(word: string, target: Concentration) {
  return (word === "elixir" && target === "Elixir") || (word === "extrait" && target === "Extrait");
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function merchantKey(merchant: string): string {
  return norm(merchant.split(/ - | \| |\(/)[0]).replace(/\b(com|inc|llc|store|official)\b/g, "").trim();
}

/** SHOP-06: one row per merchant + size + price; keep the first (provider order) and mark the rest. */
export function dedupe(offers: MatchedOffer[]): MatchedOffer[] {
  const seen = new Set<string>();
  return offers.map((o) => {
    if (o.status === "rejected") return o;
    const key = `${merchantKey(o.merchant)}|${o.parsed.sizeMl ?? "?"}|${o.listPrice.toFixed(2)}`;
    if (seen.has(key)) return { ...o, status: "rejected" as const, reasons: [...o.reasons, "duplicate" as const] };
    seen.add(key);
    return o;
  });
}

export type PriceBasis = "landed" | "listed";

export type OfferComparison = {
  exact: MatchedOffer[];
  needsVerification: MatchedOffer[];
  rejected: MatchedOffer[];
  /** "landed" (price + shipping + tax) only when every exact offer states shipping; otherwise "listed". */
  basis: PriceBasis;
  shippingUnknownCount: number;
  rejectedSummary: Partial<Record<MatchReason, number>>;
};

export function landedPrice(o: Pick<RawListing, "listPrice" | "shippingPrice" | "taxPrice">): number | null {
  if (o.shippingPrice == null) return null;
  return round2(o.listPrice + o.shippingPrice + (o.taxPrice ?? 0));
}

/** Groups and ranks matched offers. Never ranks across bases: it's landed for all or listed for all. */
export function compareOffers(target: OfferTarget, listings: RawListing[]): OfferComparison {
  const matched = dedupe(listings.map((l) => matchListing(target, l)));
  const exact = matched.filter((o) => o.status === "exact");
  const needsVerification = matched.filter((o) => o.status === "probable");
  const rejected = matched.filter((o) => o.status === "rejected");
  const shippingUnknownCount = exact.filter((o) => o.shippingPrice == null).length;
  const basis: PriceBasis = exact.length > 0 && shippingUnknownCount === 0 ? "landed" : "listed";
  const price = (o: MatchedOffer) => (basis === "landed" ? landedPrice(o)! : o.listPrice);
  exact.sort((a, b) => price(a) - price(b) || a.merchant.localeCompare(b.merchant));
  needsVerification.sort((a, b) => a.listPrice - b.listPrice);
  const rejectedSummary: Partial<Record<MatchReason, number>> = {};
  for (const o of rejected) {
    const main = o.reasons.find((r) => r !== "concentration_unstated" && r !== "size_unstated") ?? o.reasons[0];
    rejectedSummary[main] = (rejectedSummary[main] ?? 0) + 1;
  }
  return { exact, needsVerification, rejected, basis, shippingUnknownCount, rejectedSummary };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export const REASON_LABEL: Record<MatchReason, string> = {
  brand_missing: "different brand",
  name_missing: "different fragrance",
  different_edition: "different edition or flanker",
  concentration_mismatch: "different concentration",
  concentration_unstated: "concentration not stated",
  size_mismatch: "different size",
  size_unstated: "size not stated",
  not_new_full_bottle: "tester, sample, travel size or used",
  multi_item_set: "gift set or bundle",
  unrecognised_words: "extra words that may mean a different edition",
  unsafe_url: "unsafe link",
  non_usd: "not priced in USD",
  duplicate: "duplicate listing",
};
