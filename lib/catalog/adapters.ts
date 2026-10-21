import { z } from "zod";
import type { Concentration } from "@/lib/domain/fragrance";

/**
 * A catalog record as an external provider describes it, already normalised. Business logic only
 * ever sees this shape (or the DB row), never a provider's raw JSON (Architecture §Components).
 */
export type ExternalFragrance = {
  provider: "openbeautyfacts" | "fixture";
  externalId: string;
  brand: string;
  name: string;
  concentration: Concentration | null;
  sizesMl: number[];
  imageUrl: string | null;
  sourceUrl: string;
};

export interface CatalogAdapter {
  id: ExternalFragrance["provider"];
  label: string;
  live: boolean;
  search(query: string, page: number): Promise<ExternalFragrance[]>;
}

export class CatalogProviderError extends Error {}

// ── Open Beauty Facts (open database, ODbL; images CC BY-SA) ────────────────

const ObfProduct = z.object({
  code: z.string(),
  product_name: z.string().optional(),
  brands: z.string().optional(),
  quantity: z.string().optional(),
  categories_tags: z.array(z.string()).optional(),
  image_front_url: z.string().optional(),
});
const ObfResponse = z.object({ products: z.array(z.unknown()) });

const FRAGRANCE_CATEGORIES = /^en:(perfumes|fragrances|eau-de-parfum|eau-de-toilette|eau-de-cologne|men-s-fragrances|women-s-fragrances|men-s-perfumes|women-s-perfumes)$/i;

export function concentrationFromText(text: string): Concentration | null {
  const t = text.toLowerCase();
  if (/extrait/.test(t)) return "Extrait";
  if (/elixir/.test(t)) return "Elixir";
  if (/eau[- ]de[- ]parfum|\bedp\b/.test(t)) return "EDP";
  if (/eau[- ]de[- ]toilette|\bedt\b/.test(t)) return "EDT";
  if (/eau[- ]de[- ]cologne|\bedc\b/.test(t)) return "EDC";
  if (/\bparfum\b/.test(t)) return "Parfum";
  return null;
}

export function sizeFromQuantity(q: string | undefined): number[] {
  const m = /(\d{1,3}(?:[.,]\d)?)\s*ml/i.exec(q ?? "");
  return m ? [Number(m[1].replace(",", "."))] : [];
}

export function mapObfProduct(raw: unknown): ExternalFragrance | null {
  const p = ObfProduct.safeParse(raw);
  if (!p.success) return null;
  const { code, product_name, brands, quantity, categories_tags = [], image_front_url } = p.data;
  if (!product_name?.trim() || !brands?.trim()) return null;
  // Open Beauty Facts also lists deodorants and body sprays; keep only fragrance categories.
  if (!categories_tags.some((c) => FRAGRANCE_CATEGORIES.test(c))) return null;
  const brand = brands.split(",")[0].trim().slice(0, 120);
  const name = product_name.trim().slice(0, 200);
  return {
    provider: "openbeautyfacts",
    externalId: code,
    brand,
    name,
    concentration: concentrationFromText(`${name} ${categories_tags.join(" ")}`),
    sizesMl: sizeFromQuantity(quantity),
    imageUrl: image_front_url?.startsWith("https://images.openbeautyfacts.org/") ? image_front_url : null,
    sourceUrl: `https://world.openbeautyfacts.org/product/${encodeURIComponent(code)}`,
  };
}

export class OpenBeautyFactsAdapter implements CatalogAdapter {
  id = "openbeautyfacts" as const;
  label = "Open Beauty Facts (live)";
  live = true;

  async search(query: string, page: number): Promise<ExternalFragrance[]> {
    const params = new URLSearchParams({
      search_terms: query,
      search_simple: "1",
      json: "1",
      page: String(page + 1),
      page_size: "24",
      fields: "code,product_name,brands,quantity,categories_tags,image_front_url",
    });
    let res: Response;
    try {
      res = await fetch(`https://world.openbeautyfacts.org/cgi/search.pl?${params}`, {
        headers: { "User-Agent": "Sillage/0.1 (portfolio project; https://github.com/AdityaHasija37/sillage)" },
        signal: AbortSignal.timeout(6_000),
        next: { revalidate: 3600 },
      });
    } catch {
      throw new CatalogProviderError("Open Beauty Facts did not respond");
    }
    if (!res.ok) throw new CatalogProviderError(`Open Beauty Facts error ${res.status}`);
    const body = ObfResponse.safeParse(await res.json());
    if (!body.success) throw new CatalogProviderError("Unexpected Open Beauty Facts response");
    return body.data.products.map(mapObfProduct).filter((x): x is ExternalFragrance => x !== null);
  }
}

/** Fixed records for tests and for simulating provider behaviour offline. */
export class MockCatalogAdapter implements CatalogAdapter {
  id = "fixture" as const;
  label = "Mock catalog";
  live = false;
  constructor(
    private readonly records: ExternalFragrance[],
    private readonly fail = false,
  ) {}
  async search(query: string): Promise<ExternalFragrance[]> {
    if (this.fail) throw new CatalogProviderError("Mock outage");
    const q = query.toLowerCase();
    return this.records.filter((r) => `${r.brand} ${r.name}`.toLowerCase().includes(q));
  }
}
