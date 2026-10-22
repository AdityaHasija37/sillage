import { z } from "zod";
import type { Season } from "@/lib/domain/fragrance";
import type { Sentiment } from "@/lib/domain/profile";
import { FRESH_ACCORDS, groupStrength, OCCASION_LABEL, OCCASIONS, WARM_ACCORDS, type FragranceProfile, type Intensity } from "./profile";

export const DAILY_ALGORITHM_VERSION = "daily-1.0";

/** PRD 08 §6.2 initial weights; tunable product configuration. */
export const DAILY_WEIGHTS = { occasion: 0.3, weather: 0.25, intensity: 0.15, preference: 0.15, daypart: 0.1, rotation: 0.05 } as const;
export type DailyFactor = keyof typeof DAILY_WEIGHTS;

export const MOODS = ["fresh", "cozy", "confident", "romantic", "calm"] as const;

export const DailyContext = z.object({
  occasion: z.enum(OCCASIONS).default("casual"),
  weather: z
    .object({
      temperature: z.enum(["cold", "mild", "hot"]),
      humidity: z.enum(["dry", "humid"]).optional(),
      sky: z.enum(["clear", "rainy"]).optional(),
      source: z.enum(["manual", "api"]).default("manual"),
    })
    .optional(),
  daypart: z.enum(["day", "night"]).optional(),
  indoors: z.boolean().optional(),
  desiredIntensity: z.enum(["soft", "moderate", "strong"]).optional(),
  mood: z.enum(MOODS).optional(),
  excludedFragranceIds: z.array(z.string().uuid()).max(50).default([]),
});
export type DailyContext = z.infer<typeof DailyContext>;

export type OwnedForDaily = { profile: FragranceProfile; sentiment: Sentiment | null; dislikedNoteHit: boolean };
/** Bounded per-bottle adjustment from past "Not for me" / "Wore this" feedback (−0.3…+0.1). */
export type FeedbackAdjustment = { preference: number; tooStrong: number; tooWeak: number };

export type Factor = { key: DailyFactor; value: number; weight: number; text: string };
export type DailyPick = { fragranceId: string; name: string; brand: string; rank: number; score: number; factors: Factor[]; reasonCodes: string[]; caveats: string[]; confidence: "high" | "medium" | "low" };
export type DailyResult =
  | { status: "empty"; reason: "no_collection" | "all_excluded"; message: string; algorithmVersion: string }
  | { status: "ok"; context: DailyContext; picks: DailyPick[]; considered: number; algorithmVersion: string; onlyOne: boolean };

const SEASON_WEIGHTS: Record<"cold" | "mild" | "hot", Partial<Record<Season, number>>> = {
  cold: { winter: 1, fall: 0.6 },
  mild: { spring: 1, fall: 1, summer: 0.3, winter: 0.3 },
  hot: { summer: 1, spring: 0.5 },
};
const INTENSITY_ORDER: Intensity[] = ["soft", "moderate", "strong"];
const SENTIMENT_FIT: Record<Sentiment | "unrated", number> = { love: 1, like: 0.8, neutral: 0.5, unrated: 0.55, dislike: 0.1 };
const MOOD_ACCORDS: Record<(typeof MOODS)[number], string[]> = {
  fresh: [...FRESH_ACCORDS],
  cozy: [...WARM_ACCORDS],
  confident: ["woody", "leather", "amber", "warm spicy", "fresh spicy", "smoky", "oud"],
  romantic: ["rose", "floral", "white floral", "sweet", "vanilla", "powdery", "fruity", "iris"],
  calm: ["musky", "powdery", "iris", "lavender", "sandalwood", "aromatic", "green"],
};
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const r2 = (n: number) => Math.round(n * 100) / 100;

/** Days since the bottle was last worn → freshness 0..1. Undefined when there's no wear history at all. */
export function rotationFit(lastWornDaysAgo: number | null, hasAnyLogs: boolean): number | undefined {
  if (!hasAnyLogs) return undefined;
  if (lastWornDaysAgo == null) return 1;
  if (lastWornDaysAgo < 1) return 0.1;
  if (lastWornDaysAgo < 3) return 0.4;
  if (lastWornDaysAgo < 7) return 0.7;
  return 1;
}

/**
 * PRD 08 §6.2. Ranks only what the user owns, minus "avoid today". Deterministic; unavailable
 * factors are omitted and the remaining weights renormalised, with confidence reduced.
 */
export function dailyPick(
  rawContext: z.input<typeof DailyContext>,
  owned: OwnedForDaily[],
  history: { lastWornDaysAgo: Record<string, number | null>; hasAnyLogs: boolean; feedback: Record<string, FeedbackAdjustment> } = { lastWornDaysAgo: {}, hasAnyLogs: false, feedback: {} },
): DailyResult {
  const context = DailyContext.parse(rawContext);
  if (owned.length === 0) return { status: "empty", reason: "no_collection", message: "Add the bottles you own and Sillage will pick from them.", algorithmVersion: DAILY_ALGORITHM_VERSION };
  const excluded = new Set(context.excludedFragranceIds);
  const seen = new Set<string>();
  const eligible = owned.filter((o) => {
    if (excluded.has(o.profile.id) || seen.has(o.profile.id)) return false;
    seen.add(o.profile.id);
    return true;
  });
  if (eligible.length === 0) return { status: "empty", reason: "all_excluded", message: "Everything you own is on today's avoid list. Remove one to get a pick.", algorithmVersion: DAILY_ALGORITHM_VERSION };

  const desired: Intensity | undefined = context.desiredIntensity ?? (context.indoors ? "moderate" : undefined);
  const scored = eligible.map((o) => {
    const p = o.profile;
    const fb = history.feedback[p.id] ?? { preference: 0, tooStrong: 0, tooWeak: 0 };
    const factors: Factor[] = [];
    const caveats: string[] = [];

    if (p.occasionFit) {
      const v = p.occasionFit[context.occasion];
      factors.push({ key: "occasion", value: v, weight: DAILY_WEIGHTS.occasion, text: v >= 0.6 ? `Suits ${OCCASION_LABEL[context.occasion].toLowerCase()} (estimated)` : v >= 0.4 ? `Workable for ${OCCASION_LABEL[context.occasion].toLowerCase()}` : `A stretch for ${OCCASION_LABEL[context.occasion].toLowerCase()}` });
    } else caveats.push("Not enough data to judge the occasion");

    if (context.weather && p.seasonalFit) {
      const w = SEASON_WEIGHTS[context.weather.temperature];
      let v = Object.entries(w).reduce((s, [season, wt]) => s + wt! * p.seasonalFit![season as Season], 0) / Object.values(w).reduce((s, x) => s + x!, 0);
      // Soft nudges only: humid air favours fresher compositions, but a sweet scent never "fails" summer outright.
      if (context.weather.humidity === "humid") v += 0.1 * groupStrength(p, FRESH_ACCORDS) - 0.08 * groupStrength(p, WARM_ACCORDS);
      if (context.weather.sky === "rainy") v += 0.05 * groupStrength(p, ["woody", "aromatic", "earthy", "green", "mossy"]);
      v = clamp01(v);
      factors.push({ key: "weather", value: v, weight: DAILY_WEIGHTS.weather, text: v >= 0.7 ? `Wearers favour it in ${context.weather.temperature} weather` : v >= 0.45 ? `Fine for ${context.weather.temperature} weather` : `Less suited to ${context.weather.temperature} weather` });
    } else if (context.weather) caveats.push("No season votes, so weather fit is unknown");

    if (desired && p.intensity) {
      const d = Math.abs(INTENSITY_ORDER.indexOf(desired) - INTENSITY_ORDER.indexOf(p.intensity));
      let v = d === 0 ? 1 : d === 1 ? 0.5 : 0.1;
      // Past "too strong"/"too weak" feedback for this bottle shifts the fit a little, never fully.
      if (INTENSITY_ORDER.indexOf(desired) <= 1) v -= fb.tooStrong;
      if (INTENSITY_ORDER.indexOf(desired) >= 1) v -= fb.tooWeak;
      v = clamp01(v);
      factors.push({ key: "intensity", value: v, weight: DAILY_WEIGHTS.intensity, text: d === 0 ? `${cap(p.intensity)} projection, as you asked` : `${cap(p.intensity)} projection (you asked for ${desired})` });
    }

    let pref = SENTIMENT_FIT[o.sentiment ?? "unrated"];
    if (o.dislikedNoteHit) {
      pref -= 0.25;
      caveats.push("Contains a note you said you avoid");
    }
    if (context.mood) pref = 0.5 * pref + 0.5 * groupStrength(p, MOOD_ACCORDS[context.mood]);
    pref = clamp01(pref + fb.preference);
    factors.push({ key: "preference", value: pref, weight: DAILY_WEIGHTS.preference, text: o.sentiment === "love" ? "One you love" : o.sentiment === "like" ? "One you like" : o.sentiment === "dislike" ? "You marked it as not for you" : context.mood ? `Matches a ${context.mood} mood` : "Unrated so far" });

    if (context.daypart && p.daypartFit) {
      const v = p.daypartFit[context.daypart];
      factors.push({ key: "daypart", value: v, weight: DAILY_WEIGHTS.daypart, text: v >= 0.7 ? (context.daypart === "day" ? "Mostly worn in the daytime" : "Mostly worn in the evening") : "Worn at any time" });
    }

    const rot = rotationFit(history.lastWornDaysAgo[p.id] ?? null, history.hasAnyLogs);
    if (rot != null) {
      const days = history.lastWornDaysAgo[p.id];
      factors.push({ key: "rotation", value: rot, weight: DAILY_WEIGHTS.rotation, text: days == null ? "Not worn recently" : days < 1 ? "Worn today already" : `Last worn ${Math.round(days)} day${Math.round(days) === 1 ? "" : "s"} ago` });
    }

    const total = factors.reduce((s, f) => s + f.weight, 0);
    const score = total ? factors.reduce((s, f) => s + f.value * f.weight, 0) / total : 0;
    const omitted = Object.keys(DAILY_WEIGHTS).length - factors.length;
    const confidence: DailyPick["confidence"] = p.completeness >= 0.8 && omitted <= 2 ? "high" : p.completeness >= 0.5 ? "medium" : "low";
    const reasonCodes = [...factors].sort((a, b) => b.value * b.weight - a.value * a.weight).map((f) => f.key);
    return { profile: p, score, factors: factors.map((f) => ({ ...f, value: r2(f.value), weight: r2(f.weight / total) })), caveats, confidence, reasonCodes };
  });

  scored.sort((a, b) => b.score - a.score || a.profile.name.localeCompare(b.profile.name) || a.profile.id.localeCompare(b.profile.id));
  const picks: DailyPick[] = scored.slice(0, 3).map((s, i) => ({
    fragranceId: s.profile.id,
    name: s.profile.name,
    brand: s.profile.brand,
    rank: i + 1,
    score: Math.round(s.score * 100),
    factors: s.factors,
    reasonCodes: s.reasonCodes,
    caveats: s.caveats,
    confidence: s.confidence,
  }));
  return { status: "ok", context, picks, considered: eligible.length, algorithmVersion: DAILY_ALGORITHM_VERSION, onlyOne: eligible.length === 1 };
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

/** Templated, non-deceptive explanation from the top factors (the fallback when no model is used). */
export function explainPick(pick: DailyPick): string {
  const top = [...pick.factors].sort((a, b) => b.value * b.weight - a.value * a.weight).slice(0, 3);
  const lead = top.map((f) => f.text.charAt(0).toLowerCase() + f.text.slice(1)).join(", ");
  return `${pick.brand} ${pick.name}: ${lead}.${pick.caveats.length ? ` ${pick.caveats[0]}.` : ""}`;
}

/** Turn stored "not for me" / "wore" feedback into bounded adjustments (PRD §6.3: conservative). */
export function feedbackAdjustments(rows: { fragranceId: string; action: "wore" | "not_for_me"; reason: string | null }[]): Record<string, FeedbackAdjustment> {
  const out: Record<string, FeedbackAdjustment> = {};
  for (const r of rows) {
    const a = (out[r.fragranceId] ??= { preference: 0, tooStrong: 0, tooWeak: 0 });
    if (r.action === "wore") a.preference = Math.min(0.1, a.preference + 0.05);
    else if (r.reason === "too_strong") a.tooStrong = Math.min(0.3, a.tooStrong + 0.15);
    else if (r.reason === "too_weak") a.tooWeak = Math.min(0.3, a.tooWeak + 0.15);
    else a.preference = Math.max(-0.3, a.preference - (r.reason === "dislike_scent" ? 0.15 : 0.08));
  }
  return out;
}
