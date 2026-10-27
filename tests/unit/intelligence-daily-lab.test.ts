import { describe, expect, it } from "vitest";
import { dailyPick, explainPick, feedbackAdjustments, rotationFit } from "@/lib/intelligence/daily";
import { pairKey, predictPair, RULESET, suggestPairs } from "@/lib/intelligence/lab";
import { toProfile } from "@/lib/intelligence/profile";
import { bandFromReading } from "@/lib/intelligence/weather";
import { fixtureCatalog, frag } from "../fixtures/fragrances";

const c = fixtureCatalog();
const owned = (f: Parameters<typeof toProfile>[0], sentiment: "love" | "like" | "neutral" | "dislike" | null = "like") => ({ profile: toProfile(f), sentiment, dislikedNoteHit: false });
const shelf = [owned(c.freshCitrus, "love"), owned(c.amberVanilla, "like"), owned(c.woodyClean), owned(c.floralRose), owned(c.leather)];

describe("daily selector (M3)", () => {
  it("DS-01 only returns owned bottles and honours the avoid list", () => {
    const r = dailyPick({ occasion: "casual", excludedFragranceIds: [c.freshCitrus.id] }, shelf);
    if (r.status !== "ok") throw new Error();
    const ids = new Set(shelf.map((s) => s.profile.id));
    for (const p of r.picks) expect(ids.has(p.fragranceId)).toBe(true);
    expect(r.picks.map((p) => p.fragranceId)).not.toContain(c.freshCitrus.id);
  });

  it("DS-02 manual weather works with no network, and changes the ranking", () => {
    const hot = dailyPick({ occasion: "casual", weather: { temperature: "hot", source: "manual" } }, shelf);
    const cold = dailyPick({ occasion: "casual", weather: { temperature: "cold", source: "manual" } }, shelf);
    if (hot.status !== "ok" || cold.status !== "ok") throw new Error();
    expect(hot.picks[0].name).toBe("Citrus Sport");
    // Cold weather lifts the winter-leaning bottle relative to a hot day (casual daytime still matters).
    const rank = (r: typeof hot, name: string) => (r.status === "ok" ? r.picks.findIndex((p) => p.name === name) : -1);
    const coldWinter = dailyPick({ occasion: "evening", weather: { temperature: "cold", source: "manual" } }, shelf);
    if (coldWinter.status !== "ok") throw new Error();
    expect(coldWinter.picks[0].name).toBe("Amber Nights");
    expect(cold.picks[0].name).not.toBe("Citrus Sport");
    expect(rank(hot, "Amber Nights") === -1 || rank(hot, "Amber Nights") > rank(cold, "Amber Nights")).toBe(true);
  });

  it("DS-03 occasion and intensity change the ranking deterministically", () => {
    const day = dailyPick({ occasion: "office", daypart: "day", desiredIntensity: "soft" }, shelf);
    const night = dailyPick({ occasion: "evening", daypart: "night", desiredIntensity: "strong" }, shelf);
    if (day.status !== "ok" || night.status !== "ok") throw new Error();
    expect(day.picks[0].fragranceId).not.toBe(night.picks[0].fragranceId);
    expect(dailyPick({ occasion: "evening", daypart: "night" }, shelf)).toEqual(dailyPick({ occasion: "evening", daypart: "night" }, [...shelf].reverse()));
  });

  it("DS-04 top three are unique, each with two or more grounded factors", () => {
    const r = dailyPick({ occasion: "formal", daypart: "night", weather: { temperature: "mild", source: "manual" } }, [...shelf, shelf[0]]);
    if (r.status !== "ok") throw new Error();
    expect(new Set(r.picks.map((p) => p.fragranceId)).size).toBe(3);
    for (const p of r.picks) expect(p.factors.length).toBeGreaterThanOrEqual(2);
    expect(explainPick(r.picks[0])).toMatch(r.picks[0].name);
  });

  it("DS-06 empty or fully excluded collections return a helpful state, never invented picks", () => {
    expect(dailyPick({ occasion: "casual" }, [])).toMatchObject({ status: "empty", reason: "no_collection" });
    expect(dailyPick({ occasion: "casual", excludedFragranceIds: shelf.map((s) => s.profile.id) }, shelf)).toMatchObject({ status: "empty", reason: "all_excluded" });
    const one = dailyPick({ occasion: "casual" }, [shelf[0]]);
    expect(one).toMatchObject({ status: "ok", onlyOne: true });
  });

  it("DS-07 factor weights renormalise when data is missing and confidence drops", () => {
    const sparse = frag({ name: "Sparse", accords: { woody: 100 }, seasons: null });
    sparse.community = null;
    const r = dailyPick({ occasion: "casual", weather: { temperature: "hot", source: "manual" }, daypart: "day" }, [owned(sparse)]);
    if (r.status !== "ok") throw new Error();
    const p = r.picks[0];
    expect(p.factors.map((f) => f.key)).toEqual(["preference"]);
    expect(p.factors[0].weight).toBe(1);
    expect(p.confidence).toBe("low");
    expect(p.caveats.length).toBeGreaterThan(0);
  });

  it("feedback adjusts preference conservatively and within bounds", () => {
    const many = Array.from({ length: 10 }, () => ({ fragranceId: "f", action: "not_for_me" as const, reason: "dislike_scent" }));
    expect(feedbackAdjustments(many).f.preference).toBe(-0.3);
    const wore = Array.from({ length: 10 }, () => ({ fragranceId: "f", action: "wore" as const, reason: null }));
    expect(feedbackAdjustments(wore).f.preference).toBe(0.1);
    expect(feedbackAdjustments([{ fragranceId: "f", action: "not_for_me", reason: "too_strong" }]).f.tooStrong).toBe(0.15);
  });

  it("rotation is neutral (omitted) without any wear history, and favours under-worn bottles", () => {
    expect(rotationFit(null, false)).toBeUndefined();
    expect(rotationFit(0.2, true)).toBeLessThan(rotationFit(10, true)!);
  });

  it("maps a live reading to weather bands", () => {
    expect(bandFromReading(5, 50)).toMatchObject({ temperature: "cold", humidity: "dry", sky: "clear" });
    expect(bandFromReading(29, 80, 1.2)).toMatchObject({ temperature: "hot", humidity: "humid", sky: "rainy" });
  });
});

describe("scent lab (M4)", () => {
  const A = { profile: toProfile(c.freshCitrus), sentiment: "love" as const };
  const B = { profile: toProfile(c.woodyClean), sentiment: "like" as const };

  it("SL-01 rejects the same bottle in both slots", () => {
    expect(predictPair(A, A)).toMatchObject({ status: "invalid" });
  });

  it("SL-02 A/B and B/A share one identity and one prediction", () => {
    expect(pairKey("b", "a")).toBe(pairKey("a", "b"));
    expect(predictPair(A, B)).toEqual(predictPair(B, A));
  });

  it("SL-03 exposes components, labels predictions and confidence, and never claims high confidence", () => {
    const r = predictPair(A, B);
    if (r.status !== "ok") throw new Error();
    expect(r.components).toHaveLength(5);
    expect(r.character).toMatch(/^Predicted:/);
    expect(r.suggestedStartingApplication.text).toMatch(/not an optimal ratio/);
    expect(["medium", "low"]).toContain(r.confidence);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.complementFactors.join(" ")).toMatch(/citrus/);
  });

  it("scores a classic complement above a tension pairing", () => {
    const tv = { profile: toProfile(frag({ name: "TV", accords: { vanilla: 100, tobacco: 80, sweet: 60 } })), sentiment: "like" as const };
    const tob = { profile: toProfile(frag({ name: "Tob", accords: { tobacco: 100, honey: 70, woody: 50 } })), sentiment: "like" as const };
    const sea = { profile: toProfile(frag({ name: "Sea", accords: { aquatic: 100, fresh: 80, salty: 40 } })), sentiment: "like" as const };
    const good = predictPair(tv, tob);
    const odd = predictPair(tv, sea);
    if (good.status !== "ok" || odd.status !== "ok") throw new Error();
    expect(good.score).toBeGreaterThan(odd.score);
    expect(odd.cautionFactors.join(" ")).toMatch(/pull against/);
  });

  it("SL-06 past feedback moves similar pairings at most ±10 points", () => {
    const base = predictPair(A, B);
    if (base.status !== "ok") throw new Error();
    const tags = [...A.profile.accords.slice(0, 3), ...B.profile.accords.slice(0, 3)].map((a) => a.tag);
    const loved = predictPair(A, B, Array.from({ length: 5 }, () => ({ accords: tags, rating: 5 })));
    const hated = predictPair(A, B, Array.from({ length: 5 }, () => ({ accords: tags, rating: 1 })));
    const unrelated = predictPair(A, B, [{ accords: ["oud", "leather", "smoky"], rating: 1 }]);
    if (loved.status !== "ok" || hated.status !== "ok" || unrelated.status !== "ok") throw new Error();
    expect(loved.personalization).toBe(10);
    expect(hated.personalization).toBe(-10);
    expect(unrelated.personalization).toBe(0);
    expect(loved.baseScore).toBe(base.baseScore);
  });

  it("SL-07 missing accords give an honest insufficient-information result", () => {
    const blank = { profile: toProfile(frag({ name: "Blank", accords: {} })), sentiment: null };
    expect(predictPair(A, blank)).toMatchObject({ status: "insufficient" });
  });

  it("the ruleset is symmetric-safe and carries provenance", () => {
    expect(RULESET.provenance).toMatch(/heuristic/);
    for (const [a, b] of RULESET.complements) expect(a).not.toBe(b);
  });
});

describe("Scent Lab suggestions for an empty bench", () => {
  const c = fixtureCatalog();
  const shelf = [c.freshCitrus, c.freshAquatic, c.woodyClean, c.amberVanilla, c.floralRose, c.leather].map((f) => ({ profile: toProfile(f), sentiment: "like" as const }));
  it("offers the best untried pairs, highest first, never the same bottle more than twice", () => {
    const s = suggestPairs(shelf, [], new Set());
    expect(s.length).toBe(3);
    expect(s.map((x) => x.score)).toEqual([...s.map((x) => x.score)].sort((a, b) => b - a));
    const uses = new Map<string, number>();
    for (const x of s) for (const id of [x.aId, x.bId]) uses.set(id, (uses.get(id) ?? 0) + 1);
    expect(Math.max(...uses.values())).toBeLessThanOrEqual(2);
  });
  it("skips pairs already saved in the notebook", () => {
    const first = suggestPairs(shelf, [], new Set())[0];
    const again = suggestPairs(shelf, [], new Set([pairKey(first.aId, first.bId)]));
    expect(again.map((x) => pairKey(x.aId, x.bId))).not.toContain(pairKey(first.aId, first.bId));
  });
  it("needs at least two bottles", () => {
    expect(suggestPairs(shelf.slice(0, 1), [], new Set())).toEqual([]);
  });
});
