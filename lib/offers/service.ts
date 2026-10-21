import "server-only";
import { z } from "zod";
import { CONCENTRATIONS, type Fragrance } from "@/lib/domain/fragrance";
import { ensureVariant } from "@/lib/collection/service";
import { createServiceClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { claimRate } from "@/lib/security/rate";
import { compareOffers, type MatchReason, type OfferComparison, type OfferTarget, type RawListing } from "./match";
import { liveOfferProvider, OfferProviderError, SampleOfferProvider, type OfferProvider } from "./providers";

export const OfferSearchInput = z.object({
  fragranceId: z.string().uuid(),
  concentration: z.enum(CONCENTRATIONS),
  sizeMl: z.number().min(1).max(1000),
});

/** TDR-04: live offers are reused for 6 hours, then re-checked. */
export const OFFER_TTL_HOURS = 6;

export type OfferSearchResult = {
  target: OfferTarget;
  comparison: OfferComparison;
  provider: { id: RawListing["provider"]; label: string; live: boolean };
  checkedAt: string;
  fromCache: boolean;
  /** Why live data isn't shown, when it isn't. */
  notice: null | "no_live_key" | "rate_limited" | "provider_error" | "quota";
};

/**
 * On-demand only (PRD): runs when the user presses Compare prices. Live results come from SerpApi
 * when configured; otherwise, or when the live source fails, the clearly labelled sample provider
 * is used and the reason is returned so the UI can say so.
 */
export async function searchOffers(fragrance: Fragrance, input: z.input<typeof OfferSearchInput>, userId: string): Promise<OfferSearchResult> {
  const { concentration, sizeMl } = OfferSearchInput.parse(input);
  const target: OfferTarget = { brand: fragrance.brand, name: fragrance.name, concentration, sizeMl };
  const sample = new SampleOfferProvider(fragrance.priceBand);
  const live = liveOfferProvider();

  const fromSample = async (notice: OfferSearchResult["notice"]): Promise<OfferSearchResult> => ({
    target,
    comparison: compareOffers(target, await sample.searchOffers(target)),
    provider: { id: sample.id, label: sample.label, live: false },
    checkedAt: new Date().toISOString(),
    fromCache: false,
    notice,
  });

  if (!live) return fromSample("no_live_key");

  const variantId = await ensureVariant({ fragranceId: fragrance.id, concentration, sizeMl });
  if (variantId) {
    const cached = await readCache(variantId, live);
    if (cached) return { target, comparison: compareOffers(target, cached.listings), provider: { id: live.id, label: live.label, live: true }, checkedAt: cached.checkedAt, fromCache: true, notice: null };
  }

  if (!(await claimRate("offers", userId))) return fromSample("rate_limited");

  let listings: RawListing[];
  try {
    listings = await live.searchOffers(target, "US");
  } catch (e) {
    return fromSample(e instanceof OfferProviderError && e.kind === "quota" ? "quota" : "provider_error");
  }
  const comparison = compareOffers(target, listings);
  const checkedAt = new Date().toISOString();
  if (variantId) await writeCache(variantId, comparison, checkedAt);
  return { target, comparison, provider: { id: live.id, label: live.label, live: true }, checkedAt, fromCache: false, notice: null };
}

async function readCache(variantId: string, provider: OfferProvider): Promise<{ listings: RawListing[]; checkedAt: string } | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("offer_snapshots")
    .select("merchant, title, item_url, list_price, shipping_price, tax_price, availability, currency, checked_at")
    .eq("variant_id", variantId)
    .eq("provider", provider.id)
    .gt("expires_at", new Date().toISOString())
    .order("checked_at", { ascending: false })
    .limit(60);
  if (!data?.length) return null;
  const latest = data[0].checked_at;
  return {
    checkedAt: latest,
    listings: data
      .filter((r) => r.checked_at === latest)
      .map((r) => ({
        provider: provider.id,
        merchant: r.merchant,
        title: r.title,
        url: r.item_url,
        listPrice: Number(r.list_price),
        shippingPrice: r.shipping_price == null ? null : Number(r.shipping_price),
        taxPrice: r.tax_price == null ? null : Number(r.tax_price),
        availability: r.availability,
        currency: r.currency,
      })),
  };
}

async function writeCache(variantId: string, c: OfferComparison, checkedAt: string) {
  const expires = new Date(Date.parse(checkedAt) + OFFER_TTL_HOURS * 3600_000).toISOString();
  // Only store listings with a safe URL; rejected-for-URL rows are dropped entirely.
  const rows = [...c.exact, ...c.needsVerification, ...c.rejected]
    .filter((o) => !o.reasons.includes("unsafe_url" as MatchReason) && o.currency === "USD")
    .slice(0, 60)
    .map((o) => ({
      variant_id: variantId,
      provider: o.provider,
      merchant: o.merchant,
      title: o.title,
      item_url: o.url,
      size_ml: o.parsed.sizeMl,
      concentration: o.parsed.concentration,
      condition: o.parsed.condition,
      currency: "USD",
      list_price: o.listPrice,
      shipping_price: o.shippingPrice,
      tax_price: o.taxPrice,
      availability: o.availability,
      match_status: o.status,
      match_reasons: o.reasons,
      checked_at: checkedAt,
      expires_at: expires,
    }));
  if (rows.length) await createServiceClient().from("offer_snapshots").insert(rows);
}
