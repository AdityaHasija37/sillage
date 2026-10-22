import { describe, expect, it } from "vitest";
import { similarity, toProfile } from "@/lib/intelligence/profile";
import { collectionScore, previewCandidate, SCORE_ALGORITHM_VERSION, SCORE_WEIGHTS } from "@/lib/intelligence/score";
import { fixtureCatalog, frag } from "../fixtures/fragrances";

const c = fixtureCatalog();
const P = (f: Parameters<typeof toProfile>[0]) => toProfile(f);

describe("profile adapter (M1)", () => {
  it("maps catalog data with provenance and completeness", () => {
    const p = P(c.amberVanilla);
    expect(p.provenance).toMatchObject({ accords: "community", seasonalFit: "community", daypartFit: "community", occasionFit: "inferred", intensity: "community" });
    expect(p.seasonalFit!.winter).toBe(1);
    expect(p.completeness).toBe(1);
    expect(p.occasionFit!.evening).toBeGreaterThan(p.occasionFit!.office);
  });
  it("leaves missing data missing instead of scoring it as zero", () => {
    const bare = frag({ name: "Bare", accords: {}, seasons: null, notes: [] });
    bare.community = null;
    bare.family = null;
    const p = P(bare);
    expect(p.seasonalFit).toBeUndefined();
    expect(p.daypartFit).toBeUndefined();
    expect(p.occasionFit).toBeUndefined();
    expect(p.intensity).toBeUndefined();
    expect(p.completeness).toBe(0);
  });
  it("similarity is symmetric and 1 for identical profiles", () => {
    const a = P(c.freshCitrus);
    const b = P(c.amberVanilla);
    expect(similarity(a, b)).toBeCloseTo(similarity(b, a), 10);
    expect(similarity(a, a)).toBeCloseTo(1, 10);
  });
});

describe("collection score (M2)", () => {
  const six = [c.freshCitrus, c.freshAquatic, c.woodyClean, c.amberVanilla, c.floralRose, c.leather].map(P);

  it("CS-01 empty collection gives a helpful state and no number", () => {
    const s = collectionScore([]);
    expect(s.status).toBe("empty");
    expect(s).not.toHaveProperty("overallScore");
  });

  it("CS-02 deterministic regardless of order", () => {
    const a = collectionScore(six);
    const b = collectionScore([...six].reverse());
    expect(a).toEqual(b);
    expect(a.status === "ok" && a.algorithmVersion).toBe(SCORE_ALGORITHM_VERSION);
  });

  it("CS-03 every dimension is 0–100 and the weights renormalise when one is missing", () => {
    const s = collectionScore(six);
    if (s.status !== "ok") throw new Error();
    for (const d of s.dimensions) expect(d.score!).toBeGreaterThanOrEqual(0), expect(d.score!).toBeLessThanOrEqual(100);
    expect(s.dimensions.reduce((t, d) => t + d.appliedWeight, 0)).toBeCloseTo(1, 2);
    const expected = Math.round(s.dimensions.reduce((t, d) => t + d.score! * SCORE_WEIGHTS[d.key], 0));
    expect(s.overallScore).toBe(expected);

    // Strip season and day/night data from every bottle: season and occasion become unavailable.
    const noContext = six.map((p) => ({ ...p, seasonalFit: undefined, daypartFit: undefined, occasionFit: undefined }));
    const r = collectionScore(noContext);
    if (r.status !== "ok") throw new Error();
    expect(r.dimensions.find((d) => d.key === "season")!.score).toBeNull();
    expect(r.dimensions.find((d) => d.key === "season")!.appliedWeight).toBe(0);
    expect(r.dimensions.reduce((t, d) => t + d.appliedWeight, 0)).toBeCloseTo(1, 2);
    expect(r.missingData.join(" ")).toMatch(/Season coverage unavailable/);
    expect(r.confidence).toBe("low");
  });

  it("CS-04 an exact duplicate (same id or same canonical identity) adds nothing", () => {
    const base = collectionScore(six);
    const dupId = collectionScore([...six, six[0]]);
    const dupKey = collectionScore([...six, { ...six[0], id: "11111111-2222-4333-8444-555555555555" }]);
    expect(dupId).toEqual(base);
    expect(dupKey).toEqual(base);
    const preview = previewCandidate(six, six[2]);
    expect(preview.status).toBe("duplicate");
  });

  it("CS-05 preview is read-only and reports the delta and what changes", () => {
    const winterless = [c.freshCitrus, c.freshAquatic, c.floralRose].map(P);
    const before = JSON.stringify(winterless);
    const pv = previewCandidate(winterless, P(c.amberVanilla));
    expect(JSON.stringify(winterless)).toBe(before);
    if (pv.status !== "ok") throw new Error();
    expect(pv.delta).toBeGreaterThan(0);
    expect(pv.adds.join(" ")).toMatch(/winter|fall|evening/);
    expect(pv.dimensionDeltas.find((d) => d.key === "season")!.delta).toBeGreaterThan(0);
    // Adding a near-copy of what they own is flagged as overlap.
    const copy = previewCandidate(winterless, P(c.freshSimilar));
    if (copy.status !== "ok") throw new Error();
    expect(copy.overlap!.similarity).toBeGreaterThan(0.6);
    expect(copy.delta).toBeLessThan(pv.delta);
  });

  it("CS-06 exposes strengths, gaps with actions, methodology fields and version", () => {
    const s = collectionScore(six);
    if (s.status !== "ok") throw new Error();
    expect(s.strengths).toHaveLength(2);
    expect(s.gaps).toHaveLength(2);
    for (const g of s.gaps) expect(g.action?.href).toMatch(/^\/app\//);
    expect(s.dimensions.every((d) => d.detail.length > 0)).toBe(true);
    expect(s).toHaveProperty("completeness");
    expect(s).toHaveProperty("algorithmVersion");
  });

  it("small collections are provisional and low confidence, not penalised", () => {
    const one = collectionScore([P(c.woodyClean)]);
    if (one.status !== "ok") throw new Error();
    expect(one.dimensions.find((d) => d.key === "nonRedundancy")).toMatchObject({ score: 50, provisional: true });
    expect(one.confidence).toBe("low");
    // Provisional dimensions are never called strengths or gaps.
    expect([...one.strengths, ...one.gaps].map((x) => x.dimension)).not.toContain("nonRedundancy");
  });

  it("doesn't reward size: twenty near-identical bottles score lower diversity than four distinct ones", () => {
    const clones = Array.from({ length: 20 }, (_, i) => P(frag({ name: `Clone ${i}`, brand: `B${i}`, family: "citrus", accords: { citrus: 100, fresh: 80 - (i % 3) } })));
    const distinct = [c.freshCitrus, c.woodyClean, c.amberVanilla, c.floralRose].map(P);
    const a = collectionScore(clones);
    const b = collectionScore(distinct);
    if (a.status !== "ok" || b.status !== "ok") throw new Error();
    const dim = (s: typeof a, k: string) => s.dimensions.find((d) => d.key === k)!.score!;
    expect(dim(a, "diversity")).toBeLessThan(dim(b, "diversity"));
    expect(dim(a, "nonRedundancy")).toBeLessThan(dim(b, "nonRedundancy"));
    expect(a.overallScore).toBeLessThan(b.overallScore);
  });
});
