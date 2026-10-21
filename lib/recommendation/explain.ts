import { FAMILY_LABEL, PRICE_BAND_LABEL, type PriceBand } from "@/lib/domain/fragrance";
import type { CaveatCode, ExclusionCounts, Mode, ReasonCode } from "./engine";

const pct = (n: number) => `${Math.round(n * 100)}%`;
const k = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n));
const SEASON_NAME = { spring: "spring", summer: "summer", fall: "fall", winter: "winter" } as const;

/** Copy follows UX microcopy rules: "estimated fit", never "you will love this". */
export function reasonText(r: ReasonCode): string {
  switch (r.code) {
    case "SIMILAR_TO_OWNED":
      return `Accord profile ${pct(r.similarity)} similar to ${r.owned}`;
    case "COMMUNITY_SAYS_SIMILAR":
      return `${k(r.agree)} wearers say it reminds them of ${r.owned}`;
    case "SHARES_ACCORDS":
      return `Shares ${r.accords.join(", ")} accords`;
    case "MATCHES_LIKED_NOTES":
      return `Has notes you like: ${r.notes.join(", ")}`;
    case "MATCHES_LIKED_FAMILY":
      return `${FAMILY_LABEL[r.family]}, a family you said you enjoy`;
    case "NEW_DIRECTION":
      return `${r.family ? `${FAMILY_LABEL[r.family]} direction` : "New direction"}: at most ${pct(r.maxOverlap)} overlap with any bottle you own`;
    case "FILLS_FAMILY_GAP":
      return `Adds ${FAMILY_LABEL[r.family].toLowerCase()} (you own ${r.ownedCount})`;
    case "FILLS_SEASON_GAP":
      return `Covers ${SEASON_NAME[r.season]}, where your shelf is thin (${r.ownedCount} suited bottle${r.ownedCount === 1 ? "" : "s"})`;
    case "FILLS_DAYPART_GAP":
      return r.daypart === "day" ? `Covers daytime, where you have ${r.ownedCount} suitable bottle${r.ownedCount === 1 ? "" : "s"}` : `Covers evenings, where you have ${r.ownedCount} suitable bottle${r.ownedCount === 1 ? "" : "s"}`;
    case "SUITS_SEASON":
      return `Community votes favour it for ${SEASON_NAME[r.season]}`;
    case "SUITS_DAYPART":
      return r.daypart === "day" ? "Mostly worn in the daytime" : "Mostly worn in the evening";
    case "WITHIN_BUDGET":
      return `Estimated ${PRICE_BAND_LABEL[r.band as PriceBand]}, within your budget`;
    case "PERFORMANCE_MATCH":
      return `Longevity rated ${r.longevity}/5 by wearers`;
    case "WELL_RATED":
      return `Rated ${r.rating.toFixed(1)}/5 by ${k(r.votes)} people`;
  }
}

export function caveatText(c: CaveatCode): string {
  switch (c.code) {
    case "PRICE_UNKNOWN":
      return "Price unknown, so budget fit can't be checked";
    case "PRICE_ESTIMATED":
      return "Price band estimated from the brand's typical pricing";
    case "BUDGET_STRADDLES":
      return `Typically ${PRICE_BAND_LABEL[c.band as PriceBand]}; may be over budget`;
    case "FEW_VOTES":
      return `Only ${c.votes} community votes; signals are less reliable`;
    case "OVERLAPS_OWNED":
      return `Close to ${c.owned} (${pct(c.similarity)} accord overlap)`;
    case "SAME_LINE_AS_OWNED":
      return `Another version of ${c.owned}, which you own`;
    case "RESEMBLES_DISLIKED":
      return `Resembles ${c.owned}, which you marked as disliked`;
    case "NO_SEASON_DATA":
      return "No season votes available";
    case "LIMITED_PROFILE":
      return c.owned < 5
        ? `Based on ${c.owned} bottle${c.owned === 1 ? "" : "s"}; add a few more for sharper suggestions`
        : "None of your bottles are rated yet, so taste is inferred from ownership only";
    case "NO_CLEAR_GAP":
      return "Your collection is already well spread; showing the most distinct options instead";
  }
}

export const MODE_LABEL: Record<Mode, { title: string; blurb: string }> = {
  similar: { title: "Similar", blurb: "More of what you already love" },
  different: { title: "Different", blurb: "A new direction that still fits your taste" },
  gaps: { title: "Fill gaps", blurb: "Cover the seasons and styles your shelf is missing" },
};

export const RELAXATION: Record<keyof ExclusionCounts, string> = {
  owned: "",
  lowQuality: "",
  tooSimilar: "",
  marketing: "",
  dislikedNote: "Your disliked notes removed the most options. Try removing one in Preferences.",
  budget: "Your budget removed the most options. Try raising it.",
  season: "The season filter removed the most options. Try “Any season”.",
  daypart: "The time-of-day filter removed the most options. Try “Any time”.",
};
