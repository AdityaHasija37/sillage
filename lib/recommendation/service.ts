import "server-only";
import { createClient as createAnonClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/lib/db/database.types";
import { FRAGRANCE_COLUMNS, PRICE_BANDS, SEASONS, toFragrance, type Fragrance } from "@/lib/domain/fragrance";
import type { OwnedFragrance, Preferences } from "@/lib/domain/profile";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { ENGINE_VERSION, MODES, recommendCandidates, type RecommendationResult } from "./engine";

export const RecommendationInput = z.object({
  mode: z.enum(MODES),
  budgetMax: z.number().int().min(10).max(5000).nullable().optional(),
  season: z.enum(SEASONS).nullable().optional(),
  daypart: z.enum(["day", "night"]).nullable().optional(),
  performance: z.enum(["soft", "moderate", "strong"]).nullable().optional(),
  includeAlternatives: z.boolean().nullable().optional(),
  priceBand: z.enum(PRICE_BANDS).nullable().optional(),
  accord: z.string().trim().min(2).max(30).nullable().optional(),
  limit: z.number().int().min(1).max(10).optional(),
});
export type RecommendationInput = z.infer<typeof RecommendationInput>;

// The candidate pool is the same for everyone (well-reviewed, widely voted fragrances), so it's
// cached per server instance for 10 minutes instead of re-read on every request.
const POOL_SIZE = 3000;
const POOL_TTL_MS = 10 * 60 * 1000;
let pool: { at: number; items: Fragrance[] } | null = null;

export async function candidatePool(): Promise<Fragrance[]> {
  if (pool && Date.now() - pool.at < POOL_TTL_MS) return pool.items;
  const db = createAnonClient<Database>(supabaseUrl(), supabaseAnonKey(), { auth: { persistSession: false } });
  const items: Fragrance[] = [];
  // PostgREST caps a response at 1000 rows; page through.
  for (let from = 0; from < POOL_SIZE; from += 1000) {
    const { data, error } = await db
      .from("fragrances")
      .select(FRAGRANCE_COLUMNS)
      .gte("community_votes", 300)
      .gte("community_rating", 3.5)
      .order("popularity", { ascending: false })
      .range(from, from + 999);
    if (error) throw error;
    items.push(...(data ?? []).map(toFragrance));
    if (!data || data.length < 1000) break;
  }
  pool = { at: Date.now(), items };
  return items;
}

/** Pool plus the community "smells like" neighbours of what the user owns (they may be less popular). */
async function candidatesFor(owned: OwnedFragrance[]): Promise<Fragrance[]> {
  const base = await candidatePool();
  const have = new Set(base.map((f) => f.id));
  const neighbourIds = [...new Set(owned.flatMap((o) => o.fragrance.similarTo.filter((s) => s.agree >= 50).map((s) => s.externalId)))].slice(0, 80);
  if (!neighbourIds.length) return base;
  const supabase = await createClient();
  const { data } = await supabase.from("fragrances").select(FRAGRANCE_COLUMNS).eq("provider", "fragrantica_decant").in("external_id", neighbourIds);
  return [...base, ...(data ?? []).map(toFragrance).filter((f) => !have.has(f.id))];
}

export type StoredRun = RecommendationResult & { runId: string | null };

export async function runRecommendations(
  input: z.input<typeof RecommendationInput>,
  preferences: Preferences,
  owned: OwnedFragrance[],
  source: "discover" | "advisor" = "discover",
): Promise<StoredRun> {
  const req = RecommendationInput.parse(input);
  const catalog = await candidatesFor(owned);
  const result = recommendCandidates(req, preferences, owned, catalog);
  // Audit trail for reproducibility (Architecture: recommendation_runs). Best effort.
  const supabase = await createClient();
  const { data } = await supabase
    .from("recommendation_runs")
    .insert({
      mode: req.mode,
      source,
      criteria_json: { ...req, preferences: { ...preferences } },
      results_json: result.results.map((r) => ({ id: r.fragranceId, score: r.score, components: r.components, reasons: r.reasons.map((x) => x.code), caveats: r.caveats.map((x) => x.code) })),
      engine_version: ENGINE_VERSION,
    })
    .select("id")
    .single();
  return { ...result, runId: data?.id ?? null };
}
