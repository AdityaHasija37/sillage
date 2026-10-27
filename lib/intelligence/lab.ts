import type { Sentiment } from "@/lib/domain/profile";
import { OCCASION_LABEL, OCCASIONS, type FragranceProfile, type Intensity, type Occasion } from "./profile";

export const LAB_ALGORITHM_VERSION = "lab-1.0";

/** PRD 08 §7.3 base weights. */
export const LAB_WEIGHTS = { complementarity: 0.35, clashInverse: 0.25, intensityBalance: 0.2, familyBalance: 0.1, preferenceFit: 0.1 } as const;

/**
 * Editable layering ruleset. Provenance: common layering guidance (fresh over woods, vanilla with
 * tobacco, rose with oud…), written for Sillage as soft heuristics. Not tested chemistry; every
 * "tension" is a caution, never a ban.
 */
export const RULESET = {
  provenance: "Sillage editorial ruleset v1: common layering guidance, heuristic",
  complements: [
    ["citrus", "woody"], ["citrus", "aromatic"], ["citrus", "musky"], ["citrus", "amber"], ["fresh spicy", "woody"], ["vanilla", "tobacco"],
    ["vanilla", "woody"], ["vanilla", "lavender"], ["vanilla", "coffee"], ["vanilla", "rose"], ["rose", "oud"], ["rose", "patchouli"],
    ["amber", "woody"], ["amber", "rose"], ["amber", "oud"], ["leather", "smoky"], ["leather", "woody"], ["iris", "woody"],
    ["powdery", "vanilla"], ["floral", "musky"], ["white floral", "woody"], ["fruity", "woody"], ["fruity", "musky"], ["aquatic", "woody"],
    ["aquatic", "citrus"], ["green", "woody"], ["honey", "tobacco"], ["coffee", "amber"], ["cacao", "woody"], ["sweet", "woody"],
    ["warm spicy", "amber"], ["lavender", "amber"], ["herbal", "woody"], ["patchouli", "sweet"], ["fresh", "woody"], ["musky", "woody"],
  ] as [string, string][],
  tensions: [
    ["aquatic", "gourmand"], ["aquatic", "sweet"], ["marine", "vanilla"], ["ozonic", "caramel"], ["fruity", "smoky"], ["citrus", "oud"],
    ["white floral", "oud"], ["coffee", "aquatic"], ["animalic", "fresh"], ["aquatic", "caramel"], ["fresh", "animalic"], ["green", "caramel"],
  ] as [string, string][],
} as const;

const FAMILY_COMPLEMENTS = [
  ["citrus", "woody"], ["aromatic", "amber"], ["floral", "woody"], ["gourmand", "woody"], ["aquatic", "woody"], ["citrus", "amber"],
  ["floral", "amber"], ["leather", "amber"], ["chypre", "floral"], ["green", "floral"], ["aromatic", "woody"], ["citrus", "floral"],
];

const has = (pairs: readonly (readonly [string, string])[], a: string, b: string) => pairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

export function pairKey(a: string, b: string): string {
  return [a, b].sort().join(":");
}

export type LabInput = { profile: FragranceProfile; sentiment: Sentiment | null };
export type PastExperiment = { accords: string[]; rating: number };

export type PairPrediction =
  | { status: "invalid"; message: string }
  | { status: "insufficient"; pairKey: string; message: string; algorithmVersion: string }
  | {
      status: "ok";
      pairKey: string;
      score: number;
      baseScore: number;
      personalization: number;
      confidence: "high" | "medium" | "low";
      components: { key: keyof typeof LAB_WEIGHTS; label: string; value: number | null; weight: number }[];
      complementFactors: string[];
      cautionFactors: string[];
      dominantAccordHypotheses: { tag: string; share: number }[];
      predictedIntensity: Intensity | null;
      occasionFit: { occasion: Occasion; label: string; fit: number }[];
      character: string;
      suggestedStartingApplication: { first: string; second: string; text: string };
      algorithmVersion: string;
      provenance: string;
    };

const SENTIMENT: Record<Sentiment | "unrated", number> = { love: 100, like: 80, neutral: 50, unrated: 55, dislike: 10 };

/**
 * PRD 08 §7.3. A deterministic, labelled heuristic for two owned bottles. A/B and B/A share one
 * identity (SL-02). Past wear ratings on similar accord combinations move the score at most ±10
 * points (SL-06).
 */
export function predictPair(a: LabInput, b: LabInput, past: PastExperiment[] = []): PairPrediction {
  if (a.profile.id === b.profile.id) return { status: "invalid", message: "Choose two different bottles." };
  const key = pairKey(a.profile.id, b.profile.id);
  // Order inputs canonically so A/B and B/A compute identically.
  const [x, y] = a.profile.id < b.profile.id ? [a, b] : [b, a];
  const ax = x.profile.accords.slice(0, 6);
  const ay = y.profile.accords.slice(0, 6);
  if (!ax.length || !ay.length) {
    return { status: "insufficient", pairKey: key, message: `Not enough accord data for ${!ax.length ? x.profile.name : y.profile.name} to predict how they'd layer.`, algorithmVersion: LAB_ALGORITHM_VERSION };
  }

  let comp = 0;
  let tension = 0;
  const complementFactors: string[] = [];
  const cautionFactors: string[] = [];
  for (const p of ax)
    for (const q of ay) {
      if (p.tag === q.tag) continue;
      if (has(RULESET.complements, p.tag, q.tag)) {
        comp += p.strength * q.strength;
        if (p.strength * q.strength >= 0.2) complementFactors.push(`${p.tag} (${x.profile.name}) with ${q.tag} (${y.profile.name})`);
      }
      if (has(RULESET.tensions, p.tag, q.tag)) {
        tension += p.strength * q.strength;
        if (p.strength * q.strength >= 0.15) cautionFactors.push(`${p.tag} and ${q.tag} can pull against each other`);
      }
    }
  const shared = ax.filter((p) => ay.some((q) => q.tag === p.tag && p.strength >= 0.4 && q.strength >= 0.4)).map((p) => p.tag);
  if (shared.length) complementFactors.push(`shared ${shared.slice(0, 2).join(" and ")} ties them together`);
  if (shared.length >= 4) cautionFactors.push("very similar profiles: the blend may smell like either one alone");
  // Calibrated so a typical pair with a couple of loose complements lands mid-range and only strong,
  // classic pairings (vanilla + tobacco + woods) approach the top; 0.5 saturated almost everything.
  const complementarity = clamp(100 * (1 - Math.exp(-comp / 1.6)) + Math.min(12, shared.length * 6) - (shared.length >= 4 ? 15 : 0));
  const clashRisk = clamp(100 * (1 - Math.exp(-tension / 0.35)));

  const pa = x.profile.projection;
  const pb = y.profile.projection;
  const intensityBalance = pa != null && pb != null ? clamp(100 * (1 - Math.abs(pa - pb))) : null;
  if (pa != null && pb != null && Math.abs(pa - pb) > 0.45) cautionFactors.push(`${pa > pb ? x.profile.name : y.profile.name} projects much more and may dominate`);

  const fx = x.profile.families[0];
  const fy = y.profile.families[0];
  const familyBalance = fx && fy ? (fx === fy ? 55 : FAMILY_COMPLEMENTS.some(([m, n]) => (m === fx && n === fy) || (m === fy && n === fx)) ? 90 : 70) : null;
  const preferenceFit = (SENTIMENT[x.sentiment ?? "unrated"] + SENTIMENT[y.sentiment ?? "unrated"]) / 2;

  const components = [
    { key: "complementarity" as const, label: "Accord complementarity", value: Math.round(complementarity), weight: LAB_WEIGHTS.complementarity },
    { key: "clashInverse" as const, label: "Low clash risk", value: Math.round(100 - clashRisk), weight: LAB_WEIGHTS.clashInverse },
    { key: "intensityBalance" as const, label: "Intensity balance", value: intensityBalance == null ? null : Math.round(intensityBalance), weight: LAB_WEIGHTS.intensityBalance },
    { key: "familyBalance" as const, label: "Family balance", value: familyBalance, weight: LAB_WEIGHTS.familyBalance },
    { key: "preferenceFit" as const, label: "Your preference", value: Math.round(preferenceFit), weight: LAB_WEIGHTS.preferenceFit },
  ];
  const present = components.filter((c) => c.value != null);
  const total = present.reduce((s, c) => s + c.weight, 0);
  const baseScore = Math.round(clamp(present.reduce((s, c) => s + c.value! * c.weight, 0) / total));

  // Bounded personalisation from the user's own past wear tests of similar combinations.
  const tags = new Set([...ax.slice(0, 3), ...ay.slice(0, 3)].map((a) => a.tag));
  let wsum = 0;
  let adj = 0;
  for (const e of past) {
    const et = new Set(e.accords);
    const inter = [...tags].filter((t) => et.has(t)).length;
    const sim = inter / new Set([...tags, ...et]).size;
    if (sim < 0.3) continue;
    wsum += sim;
    adj += sim * ((e.rating - 3) / 2) * 10;
  }
  const personalization = wsum ? Math.round(Math.max(-10, Math.min(10, adj / wsum))) : 0;
  const score = Math.round(clamp(baseScore + personalization));

  // Predicted dominant accords: strengths weighted by how far each bottle projects.
  const wx = 0.5 + (pa ?? 0.5);
  const wy = 0.5 + (pb ?? 0.5);
  const merged = new Map<string, number>();
  for (const p of ax) merged.set(p.tag, (merged.get(p.tag) ?? 0) + p.strength * wx);
  for (const q of ay) merged.set(q.tag, (merged.get(q.tag) ?? 0) + q.strength * wy);
  const totalStrength = [...merged.values()].reduce((s, v) => s + v, 0);
  const dominantAccordHypotheses = [...merged.entries()]
    .sort((m, n) => n[1] - m[1] || m[0].localeCompare(n[0]))
    .slice(0, 3)
    .map(([tag, v]) => ({ tag, share: Math.round((v / totalStrength) * 100) }));

  const ix = x.profile.intensity;
  const iy = y.profile.intensity;
  const predictedIntensity: Intensity | null = ix && iy ? (ix === "strong" || iy === "strong" ? "strong" : ix === "moderate" || iy === "moderate" ? "moderate" : "soft") : (ix ?? iy ?? null);

  const occasionFit = x.profile.occasionFit && y.profile.occasionFit ? OCCASIONS.map((o) => ({ occasion: o, label: OCCASION_LABEL[o], fit: Math.round(((x.profile.occasionFit![o] + y.profile.occasionFit![o]) / 2) * 100) })).sort((m, n) => n.fit - m.fit).slice(0, 2) : [];

  // Starting experiment: the heavier bottle first as a base, the lighter one over it.
  const heavierIsX = (pa ?? 0.5) >= (pb ?? 0.5);
  const first = heavierIsX ? x.profile : y.profile;
  const second = heavierIsX ? y.profile : x.profile;
  const completeness = Math.min(x.profile.completeness, y.profile.completeness);
  const confidence: "high" | "medium" | "low" = completeness >= 0.8 && present.length === components.length ? "medium" : completeness >= 0.5 ? "low" : "low";

  return {
    status: "ok",
    pairKey: key,
    score,
    baseScore,
    personalization,
    confidence,
    components,
    complementFactors: complementFactors.slice(0, 4),
    cautionFactors: cautionFactors.slice(0, 3),
    dominantAccordHypotheses,
    predictedIntensity,
    occasionFit,
    character: `Predicted: a ${dominantAccordHypotheses.map((d) => d.tag).slice(0, 2).join("-")} blend, with ${x.profile.name} bringing ${ax[0].tag} and ${y.profile.name} bringing ${ay[0].tag}.`,
    suggestedStartingApplication: { first: first.id, second: second.id, text: `Try 1 spray of ${first.name} first, then 1 spray of ${second.name} over it. A starting experiment, not an optimal ratio.` },
    algorithmVersion: LAB_ALGORITHM_VERSION,
    provenance: RULESET.provenance,
  };
}

export type PairSuggestion = { aId: string; bId: string; score: number; character: string };

/**
 * Starting points for an empty bench: the best-predicted pairs among bottles the user owns that
 * they haven't saved yet, using no bottle more than twice so the three ideas differ. Capped at the
 * first 20 bottles (190 pairs) to stay instant.
 */
export function suggestPairs(owned: LabInput[], past: PastExperiment[], tried: Set<string>, limit = 3): PairSuggestion[] {
  const pool = owned.slice(0, 20);
  const scored: PairSuggestion[] = [];
  for (let i = 0; i < pool.length; i++)
    for (let j = i + 1; j < pool.length; j++) {
      const a = pool[i];
      const b = pool[j];
      if (tried.has(pairKey(a.profile.id, b.profile.id))) continue;
      const p = predictPair(a, b, past);
      if (p.status === "ok") scored.push({ aId: a.profile.id, bId: b.profile.id, score: p.score, character: p.character });
    }
  scored.sort((x, y) => y.score - x.score || x.aId.localeCompare(y.aId));
  const uses = new Map<string, number>();
  const out: PairSuggestion[] = [];
  for (const s of scored) {
    if ((uses.get(s.aId) ?? 0) >= 2 || (uses.get(s.bId) ?? 0) >= 2) continue;
    out.push(s);
    uses.set(s.aId, (uses.get(s.aId) ?? 0) + 1);
    uses.set(s.bId, (uses.get(s.bId) ?? 0) + 1);
    if (out.length === limit) break;
  }
  return out;
}
