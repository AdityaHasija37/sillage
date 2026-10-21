import { describe, expect, it } from "vitest";
import { EMPTY_PREFERENCES, type Preferences } from "@/lib/domain/profile";
import { matchingNotes, recommendCandidates } from "@/lib/recommendation/engine";
import { caveatText, reasonText } from "@/lib/recommendation/explain";
import { fixtureCatalog, frag, own } from "../fixtures/fragrances";

const prefs = (p: Partial<Preferences> = {}): Preferences => ({ ...EMPTY_PREFERENCES, ...p });

describe("recommendCandidates", () => {
  const c = fixtureCatalog();
  const catalog = Object.values(c);

  it("REC-01 similar mode favours overlap with a positively rated fragrance", () => {
    const owned = [own(c.freshCitrus, "love"), own(c.amberVanilla, "neutral")];
    const res = recommendCandidates({ mode: "similar" }, prefs(), owned, catalog);
    expect(res.results[0].fragrance.name).toBe("Citrus Sport Intense Cousin");
    const reason = res.results[0].reasons.find((r) => r.code === "SIMILAR_TO_OWNED");
    expect(reason).toMatchObject({ owned: "Fixture House Citrus Sport" });
  });

  it("REC-01b a disliked bottle does not anchor similar mode", () => {
    const owned = [own(c.freshCitrus, "dislike"), own(c.amberVanilla, "love")];
    const res = recommendCandidates({ mode: "similar" }, prefs(), owned, catalog);
    const names = res.results.slice(0, 2).map((r) => r.fragrance.name);
    expect(names).not.toContain("Citrus Sport Intense Cousin");
    expect(["Caramel Cloud", "Tobacco Leaf"]).toContain(res.results[0].fragrance.name);
  });

  it("REC-02 different mode avoids the strongly overlapping family but keeps preference fit", () => {
    const owned = [own(c.freshCitrus, "love"), own(c.freshAquatic, "like")];
    const res = recommendCandidates({ mode: "different" }, prefs({ likedFamilies: ["woody"] }), owned, catalog);
    const top = res.results.slice(0, 3);
    expect(top.map((r) => r.fragrance.name)).not.toContain("Citrus Sport Intense Cousin");
    expect(top[0].reasons.some((r) => r.code === "NEW_DIRECTION")).toBe(true);
    expect(res.excluded.tooSimilar).toBeGreaterThan(0);
    // Liked family still pulls a woody pick to the top.
    expect(top[0].fragrance.family).toBe("woody");
  });

  it("REC-03 gap mode targets an under-represented season/family and names it", () => {
    const owned = [own(c.freshCitrus, "like"), own(c.freshAquatic, "like"), own(c.freshSimilar, "like"), own(c.floralRose, "like")];
    const res = recommendCandidates({ mode: "gaps" }, prefs(), owned, catalog);
    const top = res.results[0];
    // Fall and winter are both thin here (every bottle leans spring/summer); either is a fair gap.
    expect(top.reasons.some((r) => r.code === "FILLS_SEASON_GAP" && (r.season === "winter" || r.season === "fall"))).toBe(true);
    // Four bottles is too few to call a family "missing".
    expect(res.results.every((r) => !r.reasons.some((x) => x.code === "FILLS_FAMILY_GAP"))).toBe(true);
    expect(res.globalCaveats.map((g) => g.code)).not.toContain("NO_CLEAR_GAP");
  });

  it("REC-03b gap mode does not invent a shortage for a tiny collection", () => {
    const res = recommendCandidates({ mode: "gaps" }, prefs(), [own(c.freshCitrus, "like")], catalog);
    expect(res.results.every((r) => !r.reasons.some((x) => x.code === "FILLS_FAMILY_GAP" || x.code === "FILLS_SEASON_GAP"))).toBe(true);
    expect(res.globalCaveats.map((g) => g.code)).toEqual(expect.arrayContaining(["NO_CLEAR_GAP", "LIMITED_PROFILE"]));
  });

  it("REC-04 never recommends an owned fragrance, by id or canonical identity", () => {
    const duplicateIdentity = { ...c.woodyClean, id: "99999999-0000-4000-8000-000000000001", externalId: "other" };
    const owned = [own(c.woodyClean, "love"), own(c.freshCitrus, "like")];
    for (const mode of ["similar", "different", "gaps"] as const) {
      const res = recommendCandidates({ mode, limit: 10 }, prefs(), owned, [...catalog, duplicateIdentity]);
      const ids = res.results.map((r) => r.fragranceId);
      expect(ids).not.toContain(c.woodyClean.id);
      expect(ids).not.toContain(duplicateIdentity.id);
      expect(ids).not.toContain(c.freshCitrus.id);
      expect(res.excluded.owned).toBe(3);
    }
  });

  it("REC-05 a disliked note is excluded, including synonyms like agarwood", () => {
    const owned = [own(c.leather, "love"), own(c.tobaccoOudFree, "like")];
    for (const mode of ["similar", "different", "gaps"] as const) {
      const res = recommendCandidates({ mode, limit: 10 }, prefs({ dislikedNotes: ["oud"] }), owned, catalog);
      expect(res.results.map((r) => r.fragrance.name)).not.toContain("Royal Oud");
      expect(res.excluded.dislikedNote).toBe(1);
    }
    expect(matchingNotes(c.woodyOud, ["oud"])).toEqual(["oud"]);
    expect(matchingNotes(c.woodyClean, ["oud"])).toEqual([]);
  });

  it("REC-05b excludes fragrances with no note data when the user avoids any note", () => {
    const blank = frag({ name: "Mystery Notes", brand: "House Q", family: "woody", accords: { woody: 100 }, notes: [] });
    const withPrefs = recommendCandidates({ mode: "different", limit: 10 }, prefs({ dislikedNotes: ["oud"] }), [own(c.freshCitrus, "like")], [blank]);
    expect(withPrefs.results).toHaveLength(0);
    expect(withPrefs.excluded.dislikedNote).toBe(1);
    const without = recommendCandidates({ mode: "different", limit: 10 }, prefs(), [own(c.freshCitrus, "like")], [blank]);
    expect(without.results).toHaveLength(1);
  });

  it("respects the budget and reports it as the most restrictive filter", () => {
    const owned = [own(c.freshCitrus, "like")];
    const res = recommendCandidates({ mode: "different", budgetMax: 50, limit: 10 }, prefs(), owned, catalog);
    for (const r of res.results) expect(["under_50", null]).toContain(r.fragrance.priceBand);
    expect(res.mostRestrictive).toBe("budget");
  });

  it("flags unknown prices instead of guessing", () => {
    const mystery = frag({ name: "Mystery", family: "woody", accords: { woody: 100, amber: 50 }, priceBand: null });
    const res = recommendCandidates({ mode: "different", budgetMax: 80 }, prefs(), [own(c.freshCitrus, "like")], [mystery]);
    expect(res.results[0].caveats).toContainEqual({ code: "PRICE_UNKNOWN" });
  });

  it("excludes low-rated fragrances from eligibility", () => {
    const res = recommendCandidates({ mode: "similar", limit: 10 }, prefs(), [own(c.freshCitrus, "love")], catalog);
    expect(res.results.map((r) => r.fragrance.name)).not.toContain("Unloved Citrus");
    expect(res.excluded.lowQuality).toBe(1);
  });

  it("filters by requested season", () => {
    const res = recommendCandidates({ mode: "different", season: "summer", limit: 10 }, prefs(), [own(c.amberVanilla, "love")], catalog);
    expect(res.results.length).toBeGreaterThan(0);
    for (const r of res.results) expect(r.fragrance.community!.seasons.summer!).toBeGreaterThanOrEqual(15);
  });

  it("uses saved preferred seasons as a soft context preference", () => {
    const owned = [own(c.woodyClean, "like")];
    const winter = recommendCandidates({ mode: "different", limit: 10 }, prefs({ seasons: ["winter"] }), owned, catalog);
    const summer = recommendCandidates({ mode: "different", limit: 10 }, prefs({ seasons: ["summer"] }), owned, catalog);
    const score = (r: typeof winter, name: string) => r.results.find((x) => x.fragrance.name === name)?.components.context ?? 0;
    expect(score(winter, "Amber Nights")).toBeGreaterThan(score(summer, "Amber Nights"));
    expect(score(summer, "Blue Tide")).toBeGreaterThan(score(winter, "Blue Tide"));
  });

  it("uses community 'smells like' edges as evidence", () => {
    const base = frag({ name: "Original", externalId: "ext-orig", family: "amber", accords: { amber: 100, vanilla: 60 } });
    const clone = frag({ name: "Clone", externalId: "ext-clone", family: "amber", accords: { amber: 100, vanilla: 50, fruity: 30 }, similarTo: [{ externalId: "ext-orig", agree: 900, disagree: 40 }] });
    const res = recommendCandidates({ mode: "similar" }, prefs(), [own(base, "love")], [clone]);
    expect(res.results[0].reasons).toContainEqual({ code: "COMMUNITY_SAYS_SIMILAR", owned: "Fixture House Original", agree: 900 });
  });

  it("flags and down-weights flankers of an owned bottle instead of hiding them", () => {
    const base = frag({ name: "Velvet Night", brand: "Maison Z", family: "amber", accords: { amber: 100, vanilla: 70 } });
    const flanker = frag({ name: "Velvet Night Glitter", brand: "Maison Z", family: "amber", accords: { amber: 100, vanilla: 65, fruity: 20 } });
    const res = recommendCandidates({ mode: "similar" }, prefs(), [own(base, "love")], [flanker]);
    expect(res.results[0].caveats).toContainEqual({ code: "SAME_LINE_AS_OWNED", owned: "Maison Z Velvet Night" });
  });

  it("finds a time-of-day gap for an evening-only shelf", () => {
    const night = (n: string) => frag({ name: n, brand: `N ${n}`, family: "amber", accords: { amber: 100, "warm spicy": 60 }, day: 15, night: 85 });
    const owned = ["A", "B", "C"].map((n) => own(night(n), "like"));
    const res = recommendCandidates({ mode: "gaps", limit: 10 }, prefs(), owned, catalog);
    const top = res.results[0];
    expect(top.reasons.some((r) => r.code === "FILLS_DAYPART_GAP" && r.daypart === "day")).toBe(true);
  });

  it("Q-01: budget alternatives are included and labelled by default, excluded when switched off", () => {
    const original = frag({ name: "Grand Original", brand: "Maison Lux", family: "amber", accords: { amber: 100, vanilla: 70, tobacco: 40 }, priceBand: "200_plus" });
    const alt = frag({ name: "Close Alternative", brand: "Value House", family: "amber", accords: { amber: 100, vanilla: 65, tobacco: 45 }, priceBand: "under_50", alternativeTo: { externalId: "x", name: "Maison Lux Grand Original", agree: 800 } });
    const owned = [own(c.amberVanilla, "love")];
    const on = recommendCandidates({ mode: "similar", limit: 10 }, prefs(), owned, [original, alt]);
    expect(on.results.find((r) => r.fragrance.name === "Close Alternative")?.reasons).toContainEqual({ code: "BUDGET_ALTERNATIVE", to: "Maison Lux Grand Original", agree: 800 });
    const off = recommendCandidates({ mode: "similar", limit: 10, includeAlternatives: false }, prefs(), owned, [original, alt]);
    expect(off.results.map((r) => r.fragrance.name)).toEqual(["Grand Original"]);
    expect(off.excluded.alternatives).toBe(1);
    const savedOff = recommendCandidates({ mode: "similar", limit: 10 }, prefs({ includeAlternatives: false }), owned, [original, alt]);
    expect(savedOff.excluded.alternatives).toBe(1);
  });

  it("is deterministic", () => {
    const owned = [own(c.freshCitrus, "love"), own(c.amberVanilla, "like")];
    const a = recommendCandidates({ mode: "different" }, prefs(), owned, catalog);
    const b = recommendCandidates({ mode: "different" }, prefs(), owned, [...catalog].reverse());
    expect(a.results.map((r) => r.fragranceId)).toEqual(b.results.map((r) => r.fragranceId));
  });

  it("every reason and caveat has readable copy", () => {
    const owned = [own(c.freshCitrus, "love"), own(c.freshAquatic, "like"), own(c.floralRose, null)];
    for (const mode of ["similar", "different", "gaps"] as const) {
      const res = recommendCandidates({ mode, budgetMax: 120, season: "winter", limit: 10 }, prefs({ likedNotes: ["vanilla"] }), owned, catalog);
      for (const r of res.results) {
        for (const x of r.reasons) expect(reasonText(x)).toMatch(/\w/);
        for (const x of r.caveats) expect(caveatText(x)).toMatch(/\w/);
      }
    }
  });
});
