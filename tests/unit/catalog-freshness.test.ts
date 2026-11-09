import { describe, expect, it } from "vitest";
import { matchKeys, matchUnverified } from "@/lib/catalog/merge-match.mjs";
import { normalizeRequest } from "@/lib/catalog/requests-shared";
import { voteMaturity } from "@/lib/domain/fragrance";

const catalog = [
  { externalId: "1", brand: "Chanel", name: "Bleu de Chanel" },
  { externalId: "2", brand: "Chanel", name: "Bleu de Chanel Eau de Parfum" },
  { externalId: "3", brand: "Chanel", name: "Bleu de Chanel Parfum" },
  { externalId: "4", brand: "Maison Nouvelle", name: "Launch" },
  { externalId: "5", brand: "Dior", name: "Sauvage" },
  { externalId: "6", brand: "Dior", name: "Sauvage Elixir" },
];

describe("merging unverified entries (DEC-59)", () => {
  it("normalises sizes, sprays, abbreviations and a repeated brand", () => {
    expect(matchKeys("Chanel", "Chanel Bleu de Chanel EDP 100 ml Spray")).toEqual(["chanel::bleu de chanel eau de parfum", "chanel::bleu de chanel"]);
    expect(matchKeys("Hermès", "Terre d'Hermès 3.4 fl oz")[0]).toBe("hermes::terre d hermes");
  });
  it("matches exactly when the concentration is stated", () => {
    expect(matchUnverified([{ id: "u1", brand: "Chanel", name: "Bleu de Chanel EDP 100ml" }], catalog)).toEqual([{ fromId: "u1", toExternalId: "2", level: 1 }]);
    expect(matchUnverified([{ id: "u2", brand: "Chanel", name: "Bleu de Chanel Parfum 50 ml" }], catalog)).toEqual([{ fromId: "u2", toExternalId: "3", level: 1 }]);
  });
  it("falls back to the name without concentration only when that is unambiguous", () => {
    expect(matchUnverified([{ id: "u3", brand: "Maison Nouvelle", name: "Launch Eau de Parfum 75ml" }], catalog)).toEqual([{ fromId: "u3", toExternalId: "4", level: 2 }]);
    // "Bleu de Chanel Eau de Toilette" loosens to "bleu de chanel", which entries 1 and 2 both share: left alone.
    expect(matchUnverified([{ id: "u4", brand: "Chanel", name: "Bleu de Chanel Eau de Toilette" }], catalog)).toEqual([]);
  });
  it("never merges a flanker into the original or guesses across brands", () => {
    expect(matchUnverified([{ id: "u5", brand: "Dior", name: "Sauvage Elixir 60ml" }], catalog)).toEqual([{ fromId: "u5", toExternalId: "6", level: 1 }]);
    expect(matchUnverified([{ id: "u6", brand: "Dior", name: "Sauvage Eau Forte" }], catalog)).toEqual([]);
    expect(matchUnverified([{ id: "u7", brand: "Armaf", name: "Sauvage" }], catalog)).toEqual([]);
  });
});

describe("new releases (DEC-57)", () => {
  const now = new Date("2026-11-09");
  it("labels recent launches with few votes, and older low-vote entries as few votes", () => {
    expect(voteMaturity(2026, 12, now)).toBe("new_release");
    expect(voteMaturity(2025, 49, now)).toBe("new_release");
    expect(voteMaturity(2023, 20, now)).toBe("few_votes");
    expect(voteMaturity(2026, 50, now)).toBeNull();
    expect(voteMaturity(2026, 0, now)).toBeNull();
    expect(voteMaturity(null, 10, now)).toBe("few_votes");
  });
});

describe("missing-fragrance requests (DEC-58)", () => {
  it("normalises what people typed", () => {
    expect(normalizeRequest("  Maison Nouvelle — LAUNCH!! ")).toBe("maison nouvelle launch");
    expect(normalizeRequest("Terre d'Hermès")).toBe("terre d hermes");
    expect(normalizeRequest("x")).toBeNull();
    expect(normalizeRequest("a".repeat(200))).toHaveLength(120);
  });
});
