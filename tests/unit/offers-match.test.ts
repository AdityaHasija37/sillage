import { describe, expect, it } from "vitest";
import { compareOffers, matchListing, parseConcentration, parseSizeMl, type OfferTarget, type RawListing } from "@/lib/offers/match";

const target: OfferTarget = { brand: "Dior", name: "Sauvage", concentration: "EDP", sizeMl: 100 };

const listing = (title: string, over: Partial<RawListing> = {}): RawListing => ({
  provider: "sample",
  merchant: "Example Shop",
  title,
  url: "https://shop.example/item/1",
  listPrice: 120,
  shippingPrice: 0,
  taxPrice: null,
  availability: "In stock",
  currency: "USD",
  ...over,
});

describe("parsing", () => {
  it("reads sizes in ml and fl oz", () => {
    expect(parseSizeMl("Sauvage EDP 100ml")).toBe(100);
    expect(parseSizeMl("Sauvage Eau de Parfum 3.4 oz")).toBe(100);
    expect(parseSizeMl("Sauvage 1.7 fl. oz spray")).toBe(50);
    expect(parseSizeMl("Sauvage 6.8 oz")).toBe(200);
    expect(parseSizeMl("Sauvage spray")).toBeNull();
  });
  it("reads concentrations without confusing EDP and Parfum", () => {
    expect(parseConcentration("Dior Sauvage Eau de Parfum Spray")).toBe("EDP");
    expect(parseConcentration("Dior Sauvage Parfum 100 ml")).toBe("Parfum");
    expect(parseConcentration("Dior Sauvage EDT")).toBe("EDT");
    expect(parseConcentration("Dior Sauvage Elixir")).toBe("Elixir");
    expect(parseConcentration("Dior Sauvage for men")).toBeNull();
  });
});

describe("matchListing", () => {
  it("SHOP-01 accepts exact brand/name/EDP/100 mL", () => {
    expect(matchListing(target, listing("Dior Sauvage Eau de Parfum Spray 3.4 oz / 100 ml")).status).toBe("exact");
  });
  it("SHOP-02 rejects EDT when EDP was requested", () => {
    const m = matchListing(target, listing("Dior Sauvage Eau de Toilette 100ml"));
    expect(m.status).toBe("rejected");
    expect(m.reasons).toContain("concentration_mismatch");
  });
  it("SHOP-03 rejects 50 mL when 100 mL was requested", () => {
    const m = matchListing(target, listing("Dior Sauvage EDP 50ml"));
    expect(m.status).toBe("rejected");
    expect(m.reasons).toContain("size_mismatch");
  });
  it("SHOP-04 rejects flanker editions", () => {
    for (const t of ["Dior Sauvage Elixir 100ml", "Dior Sauvage Eau de Parfum Into The Wild 100ml", "Dior Sauvage Very Cool Spray EDP 100ml"]) {
      expect(matchListing(target, listing(t)).reasons).toContain("different_edition");
    }
    // …but a flanker that *is* the target matches.
    const elixir: OfferTarget = { brand: "Dior", name: "Sauvage Elixir", concentration: "Elixir", sizeMl: 60 };
    expect(matchListing(elixir, listing("Dior Sauvage Elixir 60 ml")).status).toBe("exact");
  });
  it("rejects testers, sets, samples and travel sizes", () => {
    expect(matchListing(target, listing("Dior Sauvage EDP 100ml Tester")).status).toBe("rejected");
    expect(matchListing(target, listing("Dior Sauvage EDP 100ml Gift Set")).reasons).toContain("multi_item_set");
    expect(matchListing(target, listing("Dior Sauvage EDP 2ml sample vial")).status).toBe("rejected");
    expect(matchListing(target, listing("Dior Sauvage EDP travel spray 100ml")).status).toBe("rejected");
  });
  it("marks unstated size or concentration as probable, never exact", () => {
    expect(matchListing(target, listing("Dior Sauvage Eau de Parfum")).status).toBe("probable");
    expect(matchListing(target, listing("Dior Sauvage 100 ml")).status).toBe("probable");
  });
  it("rejects another brand or fragrance", () => {
    expect(matchListing(target, listing("Armaf Club de Nuit Sauvage EDP 100ml")).reasons).toContain("brand_missing");
    expect(matchListing(target, listing("Dior Homme EDP 100ml")).reasons).toContain("name_missing");
  });
  it("SEC-04 rejects non-https or script URLs", () => {
    expect(matchListing(target, listing("Dior Sauvage EDP 100ml", { url: "javascript:alert(1)" })).status).toBe("rejected");
    expect(matchListing(target, listing("Dior Sauvage EDP 100ml", { url: "http://shop.example/x" })).reasons).toContain("unsafe_url");
  });
});

describe("compareOffers", () => {
  it("SHOP-05 falls back to listed price and discloses unknown shipping", () => {
    const res = compareOffers(target, [
      listing("Dior Sauvage EDP 100ml", { merchant: "A", listPrice: 110, shippingPrice: 10 }),
      listing("Dior Sauvage EDP 100ml", { merchant: "B", listPrice: 115, shippingPrice: null }),
    ]);
    expect(res.basis).toBe("listed");
    expect(res.shippingUnknownCount).toBe(1);
    expect(res.exact.map((o) => o.merchant)).toEqual(["A", "B"]);
  });
  it("ranks by landed cost only when every exact offer states shipping", () => {
    const res = compareOffers(target, [
      listing("Dior Sauvage EDP 100ml", { merchant: "A", listPrice: 110, shippingPrice: 15 }),
      listing("Dior Sauvage EDP 100ml", { merchant: "B", listPrice: 118, shippingPrice: 0 }),
    ]);
    expect(res.basis).toBe("landed");
    expect(res.exact.map((o) => o.merchant)).toEqual(["B", "A"]);
  });
  it("SHOP-06 de-duplicates the same merchant listing", () => {
    const res = compareOffers(target, [
      listing("Dior Sauvage EDP 100ml", { merchant: "Walmart - Seller X", listPrice: 99 }),
      listing("Dior Sauvage Eau de Parfum 3.4 oz", { merchant: "Walmart", listPrice: 99 }),
      listing("Dior Sauvage EDP 100ml", { merchant: "Jomashop", listPrice: 105 }),
    ]);
    expect(res.exact).toHaveLength(2);
    expect(res.rejectedSummary.duplicate).toBe(1);
  });
  it("never puts a rejected listing in the exact group", () => {
    const res = compareOffers(target, [listing("Dior Sauvage EDT 100ml", { listPrice: 1 })]);
    expect(res.exact).toHaveLength(0);
    expect(res.rejectedSummary.concentration_mismatch).toBe(1);
  });
});
