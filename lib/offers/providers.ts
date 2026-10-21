import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import { PRICE_BAND_RANGE, type PriceBand } from "@/lib/domain/fragrance";
import type { OfferTarget, RawListing } from "./match";

export interface OfferProvider {
  id: RawListing["provider"];
  label: string;
  live: boolean;
  searchOffers(target: OfferTarget, region: "US"): Promise<RawListing[]>;
}

export class OfferProviderError extends Error {
  constructor(
    message: string,
    readonly kind: "unavailable" | "quota" | "bad_response",
  ) {
    super(message);
  }
}

// ── Sample provider ─────────────────────────────────────────────────────────
// Deterministic listings from fictional merchants, used when no live key is set and in tests.
// They are ALWAYS labelled "Sample offers" in the UI and never presented as real prices.
// A few deliberately wrong listings (other size, EDT/EDP swap, tester, flanker) show the matcher
// rejecting them, which is the point of the demo.

const SAMPLE_MERCHANTS = ["Sample Store North", "Sample Store East", "Sample Outlet", "Sample Marketplace"];

function seeded(seed: string) {
  let h = createHash("sha256").update(seed).digest();
  let i = 0;
  return () => {
    if (i + 4 > h.length) {
      h = createHash("sha256").update(h).digest();
      i = 0;
    }
    const v = h.readUInt32BE(i) / 0xffffffff;
    i += 4;
    return v;
  };
}

export class SampleOfferProvider implements OfferProvider {
  id = "sample" as const;
  label = "Sample offers (not live prices)";
  live = false;

  constructor(private readonly priceBand: PriceBand | null) {}

  async searchOffers(target: OfferTarget): Promise<RawListing[]> {
    const rnd = seeded(`${target.brand}|${target.name}|${target.concentration}|${target.sizeMl}`);
    const [lo, hi] = PRICE_BAND_RANGE[this.priceBand ?? "50_100"];
    const base = ((Number.isFinite(hi) ? (lo + hi) / 2 : lo * 1.4) * Math.sqrt(target.sizeMl / 100)) || 60;
    const price = (f: number) => Math.round(base * f * 100) / 100 - 0.01;
    const title = (extra = "", conc = target.concentration, size = target.sizeMl) => `${target.brand} ${target.name} ${CONC_TEXT[conc]} ${size} ml${extra}`;
    const url = (n: number) => `https://example.com/sample-offer/${encodeURIComponent(target.name.toLowerCase().replace(/\s+/g, "-"))}-${n}`;
    const otherConc = target.concentration === "EDP" ? "EDT" : "EDP";
    const otherSize = target.sizeMl >= 100 ? 50 : 100;
    const mk = (merchant: string, t: string, p: number, shipping: number | null, n: number): RawListing => ({
      provider: "sample",
      merchant,
      title: t,
      url: url(n),
      listPrice: p,
      shippingPrice: shipping,
      taxPrice: null,
      availability: "Listed",
      currency: "USD",
    });
    return [
      mk(SAMPLE_MERCHANTS[0], title(), price(0.88 + rnd() * 0.1), 0, 1),
      mk(SAMPLE_MERCHANTS[1], title(), price(0.92 + rnd() * 0.12), rnd() > 0.5 ? 6.95 : null, 2),
      mk(SAMPLE_MERCHANTS[2], title(), price(0.8 + rnd() * 0.08), 8.99, 3),
      mk(SAMPLE_MERCHANTS[3], `${target.brand} ${target.name} ${CONC_TEXT[target.concentration]}`, price(0.75 + rnd() * 0.1), null, 4),
      mk(SAMPLE_MERCHANTS[2], title(" Tester"), price(0.62), 4.99, 5),
      mk(SAMPLE_MERCHANTS[0], title("", otherConc), price(0.7), 0, 6),
      mk(SAMPLE_MERCHANTS[1], title("", target.concentration, otherSize), price(0.6), 0, 7),
      mk(SAMPLE_MERCHANTS[3], `${target.brand} ${target.name} Intense ${CONC_TEXT[target.concentration]} ${target.sizeMl} ml`, price(1.05), 0, 8),
    ];
  }
}

const CONC_TEXT = { EDC: "Eau de Cologne", EDT: "Eau de Toilette", EDP: "Eau de Parfum", Parfum: "Parfum", Extrait: "Extrait de Parfum", Elixir: "Elixir", Cologne: "Cologne" } as const;

// ── SerpApi Google Shopping ─────────────────────────────────────────────────

const SerpShoppingResult = z.object({
  title: z.string(),
  source: z.string().optional(),
  extracted_price: z.number().optional(),
  link: z.string().optional(),
  product_link: z.string().optional(),
  delivery: z.string().optional(),
  second_hand_condition: z.string().optional(),
});
const SerpResponse = z.object({
  shopping_results: z.array(z.unknown()).optional(),
  error: z.string().optional(),
});

/** "Free delivery" → 0, "$5.99 delivery" / "+$5.99 shipping" → 5.99, anything else → unknown. */
export function parseDelivery(text: string | undefined): number | null {
  if (!text) return null;
  if (/free (delivery|shipping)/i.test(text)) return 0;
  const m = /\$\s?(\d+(?:\.\d{2})?)\s*(delivery|shipping)/i.exec(text);
  return m ? Number(m[1]) : null;
}

export class SerpApiOfferProvider implements OfferProvider {
  id = "serpapi_google_shopping" as const;
  label = "Google Shopping via SerpApi";
  live = true;

  constructor(private readonly apiKey: string) {}

  async searchOffers(target: OfferTarget): Promise<RawListing[]> {
    const q = `${target.brand} ${target.name} ${CONC_TEXT[target.concentration]} ${target.sizeMl}ml`;
    const params = new URLSearchParams({ engine: "google_shopping", q, gl: "us", hl: "en", num: "40", api_key: this.apiKey });
    let res: Response;
    try {
      res = await fetch(`https://serpapi.com/search.json?${params}`, { signal: AbortSignal.timeout(12_000), cache: "no-store" });
    } catch {
      throw new OfferProviderError("Shopping search timed out", "unavailable");
    }
    if (res.status === 429) throw new OfferProviderError("Shopping search quota reached", "quota");
    if (!res.ok) throw new OfferProviderError(`Shopping search failed (${res.status})`, "unavailable");
    const body = SerpResponse.safeParse(await res.json());
    if (!body.success) throw new OfferProviderError("Unexpected shopping response", "bad_response");
    if (body.data.error) throw new OfferProviderError(/run out|limit/i.test(body.data.error) ? "Shopping search quota reached" : "Shopping search failed", /run out|limit/i.test(body.data.error) ? "quota" : "unavailable");
    const out: RawListing[] = [];
    for (const raw of body.data.shopping_results ?? []) {
      const r = SerpShoppingResult.safeParse(raw);
      if (!r.success || r.data.extracted_price == null || r.data.extracted_price <= 0) continue;
      const url = r.data.link ?? r.data.product_link;
      if (!url) continue;
      out.push({
        provider: "serpapi_google_shopping",
        merchant: (r.data.source ?? "Unknown merchant").slice(0, 120),
        title: (r.data.second_hand_condition ? `${r.data.title} (${r.data.second_hand_condition})` : r.data.title).slice(0, 300),
        url,
        listPrice: r.data.extracted_price,
        shippingPrice: parseDelivery(r.data.delivery),
        taxPrice: null,
        availability: null,
        currency: "USD",
      });
    }
    return out;
  }
}

export function liveOfferProvider(): OfferProvider | null {
  const key = process.env.SERPAPI_API_KEY;
  return key ? new SerpApiOfferProvider(key) : null;
}
