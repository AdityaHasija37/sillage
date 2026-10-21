import "server-only";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { FRAGRANCE_COLUMNS, toFragrance, type Fragrance } from "@/lib/domain/fragrance";
import { claimRate, clientKey } from "@/lib/security/rate";
import { OpenBeautyFactsAdapter, type CatalogAdapter, type ExternalFragrance } from "./adapters";

export const SearchQuery = z.object({
  q: z.string().trim().min(2, "Type at least 2 characters").max(80),
  page: z.coerce.number().int().min(0).max(20).default(0),
});

export type FragranceSummary = {
  id: string;
  brand: string;
  name: string;
  family: Fragrance["family"];
  concentration: Fragrance["concentration"];
  year: number | null;
  accords: string[];
  rating: number | null;
  votes: number;
  source: string;
  dataQuality: Fragrance["dataQuality"];
  imageUrl: string | null;
};

export type SourceStatus = { id: string; label: string; live: boolean; status: "ok" | "error" | "skipped"; count: number };

export type CatalogSearchResult = { items: FragranceSummary[]; hasMore: boolean; sources: SourceStatus[] };

export const SOURCE_LABEL: Record<string, string> = {
  fragrantica_decant: "Fragrantica community data (Decant open dataset)",
  openbeautyfacts: "Open Beauty Facts",
  fixture: "Test fixture",
};

export function toSummary(f: Fragrance): FragranceSummary {
  return {
    id: f.id,
    brand: f.brand,
    name: f.name,
    family: f.family,
    concentration: f.concentration,
    year: f.year,
    accords: f.accords.slice(0, 3).map((a) => a.name),
    rating: f.community?.rating ?? null,
    votes: f.community?.votes ?? 0,
    source: f.provider,
    dataQuality: f.dataQuality,
    imageUrl: f.imageUrl,
  };
}

const PAGE = 20;

/**
 * Search the stored catalog first (≈38k fragrances), then — only when that comes back thin on the
 * first page — a live open provider. Live results are cached into the catalog so they can be
 * collected. A provider failure is reported in `sources`; it never produces made-up items (CAT-02).
 */
export async function searchCatalog(input: z.input<typeof SearchQuery>, liveAdapter: CatalogAdapter | null = new OpenBeautyFactsAdapter()): Promise<CatalogSearchResult> {
  const { q, page } = SearchQuery.parse(input);
  const supabase = await createClient();
  const sources: SourceStatus[] = [];

  const { data, error } = await supabase.rpc("search_fragrances", { p_query: q, p_limit: PAGE + 1, p_offset: page * PAGE });
  if (error) {
    sources.push({ id: "catalog", label: "Sillage catalog", live: false, status: "error", count: 0 });
    return { items: [], hasMore: false, sources };
  }
  const rows = (data ?? []).map(toFragrance);
  const hasMore = rows.length > PAGE;
  const items = rows.slice(0, PAGE).map(toSummary);
  sources.push({ id: "catalog", label: "Sillage catalog", live: false, status: "ok", count: items.length });

  if (liveAdapter && page === 0 && items.length < 5) {
    const allowed = await claimRate("catalog_live", await clientKey());
    if (!allowed) {
      sources.push({ id: liveAdapter.id, label: liveAdapter.label, live: true, status: "skipped", count: 0 });
    } else {
      try {
        const external = await liveAdapter.search(q, 0);
        const cached = await cacheExternal(external.slice(0, 12));
        const seen = new Set(items.map((i) => i.id));
        const extra = cached.filter((f) => !seen.has(f.id)).map(toSummary);
        items.push(...extra);
        sources.push({ id: liveAdapter.id, label: liveAdapter.label, live: true, status: "ok", count: extra.length });
      } catch {
        sources.push({ id: liveAdapter.id, label: liveAdapter.label, live: true, status: "error", count: 0 });
      }
    }
  }
  return { items, hasMore, sources };
}

/** Persist provider records (service role: the catalog is shared) and return them as stored rows. */
export async function cacheExternal(records: ExternalFragrance[]): Promise<Fragrance[]> {
  if (!records.length) return [];
  const normalize = (s: string) =>
    s
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  const db = createServiceClient();
  const rows = records.map((r) => ({
    provider: r.provider,
    external_id: r.externalId,
    brand: r.brand,
    name: r.name,
    canonical_key: `${normalize(r.brand)}::${normalize(r.name)}`,
    concentration: r.concentration,
    concentration_basis: r.concentration ? "provider" : null,
    sizes_ml: r.sizesMl,
    image_url: r.imageUrl,
    source_url: r.sourceUrl,
    metadata_quality: "unverified" as const,
    fetched_at: new Date().toISOString(),
  }));
  const { data, error } = await db.from("fragrances").upsert(rows, { onConflict: "provider,external_id" }).select(FRAGRANCE_COLUMNS);
  if (error) throw error;
  return (data ?? []).map(toFragrance);
}

export async function getFragrance(id: string): Promise<Fragrance | null> {
  if (!z.string().uuid().safeParse(id).success) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("fragrances").select(FRAGRANCE_COLUMNS).eq("id", id).maybeSingle();
  return data ? toFragrance(data) : null;
}

export async function getFragrancesByExternalIds(provider: string, externalIds: string[]): Promise<Fragrance[]> {
  if (!externalIds.length) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("fragrances").select(FRAGRANCE_COLUMNS).eq("provider", provider).in("external_id", externalIds.slice(0, 50));
  return (data ?? []).map(toFragrance);
}
