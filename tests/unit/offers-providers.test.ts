import { describe, expect, it } from "vitest";
import { compareOffers } from "@/lib/offers/match";
import { parseDelivery, SampleOfferProvider } from "@/lib/offers/providers";

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

describe("parseDelivery", () => {
  it("reads free and paid delivery, else unknown", () => {
    expect(parseDelivery("Free delivery")).toBe(0);
    expect(parseDelivery("$5.99 delivery")).toBe(5.99);
    expect(parseDelivery("+$4.50 shipping")).toBe(4.5);
    expect(parseDelivery("Delivery by Fri")).toBeNull();
    expect(parseDelivery(undefined)).toBeNull();
  });
});
