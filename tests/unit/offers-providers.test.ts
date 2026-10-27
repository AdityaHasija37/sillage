import { describe, expect, it } from "vitest";
import { compareOffers } from "@/lib/offers/match";
import { normalizeUrl, parseDelivery, SampleOfferProvider } from "@/lib/offers/providers";
import { matchListing } from "@/lib/offers/match";

describe("SampleOfferProvider", () => {
  const target = { brand: "Dior", name: "Sauvage", concentration: "EDP" as const, sizeMl: 100 };

  it("is deterministic and uses fictional merchants only", async () => {
    const a = await new SampleOfferProvider("100_200").searchOffers(target);
    const b = await new SampleOfferProvider("100_200").searchOffers(target);
    expect(a).toEqual(b);
    for (const o of a) {
      expect(o.merchant).toMatch(/^Sample /);
      expect(o.url).toMatch(/^https:\/\/example\.com\//);
    }
  });

  it("includes listings the matcher must reject, and some exact ones", async () => {
    const res = compareOffers(target, await new SampleOfferProvider("100_200").searchOffers(target));
    expect(res.exact.length).toBeGreaterThanOrEqual(2);
    expect(res.needsVerification.length).toBe(1);
    expect(Object.keys(res.rejectedSummary).sort()).toEqual(["concentration_mismatch", "different_edition", "not_new_full_bottle", "size_mismatch"]);
  });
});

describe("normalizeUrl", () => {
  it("percent-encodes Google Shopping links that arrive with raw spaces, so they pass the safety check", () => {
    const raw = "https://www.google.com/search?ibp=oshop&q=Chanel Bleu de Chanel Eau de Parfum 50ml&prds=catalogid:1";
    const url = normalizeUrl(raw)!;
    expect(url).not.toMatch(/\s/);
    expect(url.startsWith("https://www.google.com/search?")).toBe(true);
    const m = matchListing({ brand: "Chanel", name: "Bleu de Chanel", concentration: "EDP", sizeMl: 50 }, { provider: "serpapi_google_shopping", merchant: "Google", title: "Chanel Bleu de Chanel Eau de Parfum 1.7 oz", url, listPrice: 120, shippingPrice: null, taxPrice: null, availability: null, currency: "USD" });
    expect(m.reasons).not.toContain("unsafe_url");
  });
  it("treats retail filler seen on live listings as filler, not as a different edition", () => {
    const target = { brand: "Chanel", name: "Bleu de Chanel", concentration: "EDP" as const, sizeMl: 100 };
    const listing = (title: string) => ({ provider: "serpapi_google_shopping" as const, merchant: "eBay", title, url: "https://ebay.com/itm/1", listPrice: 100, shippingPrice: 0, taxPrice: null, availability: null, currency: "USD" });
    for (const title of ["Chanel Bleu De Chanel Eau De Parfum Spray 3.4 Fl Oz Citrus Woody", "Chanel Bleu De Chanel Eau De Parfum Spray 3.4 Fl Oz Regular Size", "Chanel Men's Bleu De Chanel EDP Spray 3.4 oz Fragrances 3145891073607"])
      expect(matchListing(target, listing(title)).status).toBe("exact");
    // Flanker words still block an exact match.
    expect(matchListing(target, listing("Chanel Bleu De Chanel Eau De Parfum Intense 3.4 oz")).status).not.toBe("exact");
  });
  it("drops non-https and malformed links", () => {
    expect(normalizeUrl("http://shop.example/x")).toBeNull();
    expect(normalizeUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeUrl("not a url")).toBeNull();
    expect(normalizeUrl(undefined)).toBeNull();
  });
});

describe("parseDelivery", () => {
  it("reads free and paid delivery, else unknown", () => {
    expect(parseDelivery("Free delivery")).toBe(0);
    expect(parseDelivery("$5.99 delivery")).toBe(5.99);
    expect(parseDelivery("+$4.50 shipping")).toBe(4.5);
    expect(parseDelivery("Delivery by Fri")).toBeNull();
    expect(parseDelivery(undefined)).toBeNull();
  });
});
