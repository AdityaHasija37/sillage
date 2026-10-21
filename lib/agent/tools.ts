import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import {
  CONCENTRATIONS,
  displayName,
  fitsDayparts,
  fitsSeasons,
  PRICE_BAND_LABEL,
  SEASONS,
  type Fragrance,
} from "@/lib/domain/fragrance";
import { buildProfile, type OwnedFragrance, type Preferences } from "@/lib/domain/profile";
import { MODES, type RecommendationResult } from "@/lib/recommendation/engine";
import { caveatText, reasonText } from "@/lib/recommendation/explain";
import type { OfferSearchResult } from "@/lib/offers/service";
import type { FragranceSummary } from "@/lib/catalog/service";

/**
 * Everything the advisor can touch, injected so tests can run the agent against fixtures.
 * Read tools only. The two "propose_*" tools never write: they return a pending action that the
 * user must confirm in the UI (Architecture: writes only after explicit confirmation).
 */
export type AdvisorContext = {
  owned: OwnedFragrance[];
  preferences: Preferences;
  searchCatalog: (q: string) => Promise<FragranceSummary[]>;
  getFragrance: (id: string) => Promise<Fragrance | null>;
  recommend: (input: { mode: (typeof MODES)[number]; budgetMax?: number | null; season?: (typeof SEASONS)[number] | null; daypart?: "day" | "night" | null; performance?: "soft" | "moderate" | "strong" | null; includeAlternatives?: boolean | null }) => Promise<RecommendationResult & { runId: string | null }>;
  findOffers: (fragrance: Fragrance, concentration: (typeof CONCENTRATIONS)[number], sizeMl: number) => Promise<OfferSearchResult>;
};

export type PendingAction =
  | { type: "add_to_wishlist"; fragranceId: string; label: string }
  | { type: "update_preferences"; addDislikedNotes: string[]; addLikedNotes: string[]; budgetMax: number | null; label: string };

export type ToolOutcome = {
  /** JSON sent back to the model. */
  content: unknown;
  /** Fragrance ids that appeared in this result: the only ids the final answer may cite. */
  fragranceIds: string[];
  /** Text of every price the tool returned, so the answer's prices can be checked against it. */
  prices: string[];
  pending?: PendingAction;
  summary: string;
};

const strict = <T extends Record<string, unknown>>(properties: T, required: (keyof T)[] = []) => ({
  type: "object" as const,
  properties,
  required: required as string[],
  additionalProperties: false,
});

const nullable = (schema: Record<string, unknown>) => ({ anyOf: [schema, { type: "null" }] });

export const TOOL_DEFINITIONS: Anthropic.Tool[] = [
  {
    name: "get_user_profile",
    description: "The user's taste profile: collection size, family mix, season and day/night coverage, liked and disliked notes, budget. Call this first for any personal recommendation.",
    input_schema: strict({}),
    strict: true,
  },
  {
    name: "get_owned_fragrances",
    description: "The fragrances the user owns, with their sentiment (love/like/neutral/dislike or unrated) and main accords. Ownership does not mean they like it; only sentiment says that.",
    input_schema: strict({}),
    strict: true,
  },
  {
    name: "search_catalog",
    description: "Search the catalog by brand and/or name. Returns up to 8 matches with ids. Use to resolve a fragrance the user mentions by name.",
    input_schema: strict({ query: { type: "string", description: "Brand and/or fragrance name, e.g. 'Terre d'Hermes'" } }, ["query"]),
    strict: true,
  },
  {
    name: "get_fragrance_details",
    description: "Facts for one fragrance id: note pyramid, accords, community ratings, longevity, season votes, estimated price band, review themes.",
    input_schema: strict({ fragrance_id: { type: "string" } }, ["fragrance_id"]),
    strict: true,
  },
  {
    name: "recommend_candidates",
    description:
      "Run Sillage's deterministic recommendation engine against the user's collection and preferences. It already excludes owned fragrances and disliked notes. mode: similar (more of what they love), different (new direction that still fits), gaps (fill under-covered seasons/families). Returns ranked candidates with reasons and caveats. Always use this for recommendations; never recommend a fragrance that this tool or search_catalog did not return.",
    input_schema: strict(
      {
        mode: { type: "string", enum: [...MODES] },
        budget_max_usd: nullable({ type: "integer", description: "Maximum price in USD, if the user gave one" }),
        season: nullable({ type: "string", enum: [...SEASONS] }),
        daypart: nullable({ type: "string", enum: ["day", "night"] }),
        performance: nullable({ type: "string", enum: ["soft", "moderate", "strong"] }),
        include_budget_alternatives: nullable({ type: "boolean", description: "false only if the user asks for originals, not dupes/clones; null uses their saved preference" }),
      },
      ["mode", "budget_max_usd", "season", "daypart", "performance", "include_budget_alternatives"],
    ),
    strict: true,
  },
  {
    name: "find_offers",
    description: "Compare prices for one exact bottle (fragrance id + concentration + size in ml). Returns exact matches with merchant and price basis, and whether the data is live or sample. Only call when the user asks about price or buying.",
    input_schema: strict(
      { fragrance_id: { type: "string" }, concentration: { type: "string", enum: [...CONCENTRATIONS] }, size_ml: { type: "integer" } },
      ["fragrance_id", "concentration", "size_ml"],
    ),
    strict: true,
  },
  {
    name: "propose_add_to_wishlist",
    description: "Offer to add a fragrance to the user's wishlist. This does NOT save anything: the user sees a confirm button. Use only when the user asks to save or wishlist something.",
    input_schema: strict({ fragrance_id: { type: "string" } }, ["fragrance_id"]),
    strict: true,
  },
  {
    name: "propose_preference_update",
    description: "Offer to update the user's preferences (notes to avoid or seek, budget). This does NOT save anything: the user confirms in the UI. Use only when the user states a lasting preference, e.g. 'I hate oud'.",
    input_schema: strict(
      {
        add_disliked_notes: { type: "array", items: { type: "string" } },
        add_liked_notes: { type: "array", items: { type: "string" } },
        budget_max_usd: nullable({ type: "integer" }),
      },
      ["add_disliked_notes", "add_liked_notes", "budget_max_usd"],
    ),
    strict: true,
  },
];

const Id = z.string().uuid();
const inputs = {
  get_user_profile: z.object({}),
  get_owned_fragrances: z.object({}),
  search_catalog: z.object({ query: z.string().trim().min(2).max(80) }),
  get_fragrance_details: z.object({ fragrance_id: Id }),
  recommend_candidates: z.object({
    mode: z.enum(MODES),
    budget_max_usd: z.number().int().min(10).max(5000).nullable(),
    season: z.enum(SEASONS).nullable(),
    daypart: z.enum(["day", "night"]).nullable(),
    performance: z.enum(["soft", "moderate", "strong"]).nullable(),
    include_budget_alternatives: z.boolean().nullable().optional(),
  }),
  find_offers: z.object({ fragrance_id: Id, concentration: z.enum(CONCENTRATIONS), size_ml: z.number().int().min(5).max(500) }),
  propose_add_to_wishlist: z.object({ fragrance_id: Id }),
  propose_preference_update: z.object({
    add_disliked_notes: z.array(z.string().trim().min(1).max(40)).max(10),
    add_liked_notes: z.array(z.string().trim().min(1).max(40)).max(10),
    budget_max_usd: z.number().int().min(10).max(5000).nullable(),
  }),
} as const;

export type ToolName = keyof typeof inputs;
export const isToolName = (n: string): n is ToolName => n in inputs;

const brief = (f: Fragrance) => ({
  id: f.id,
  name: displayName(f),
  family: f.family,
  top_accords: f.accords.slice(0, 4).map((a) => a.name),
  rating: f.community?.rating ? Math.round(f.community.rating * 100) / 100 : null,
  votes: f.community?.votes ?? 0,
  price_band: f.priceBand ? `${PRICE_BAND_LABEL[f.priceBand]} (estimated)` : "unknown",
});

class ToolInputError extends Error {}

/** Validates model input with Zod (never trust tool_use.input), runs the tool, and shapes the result. */
export async function executeTool(name: string, rawInput: unknown, ctx: AdvisorContext): Promise<ToolOutcome> {
  if (!isToolName(name)) throw new ToolInputError(`Unknown tool ${name}`);
  const parsed = inputs[name].safeParse(rawInput);
  if (!parsed.success) throw new ToolInputError(`Invalid input for ${name}: ${parsed.error.issues.map((i) => i.message).join("; ")}`);
  const input = parsed.data as never;
  switch (name) {
    case "get_user_profile": {
      const p = buildProfile(ctx.owned);
      const families = Object.entries(p.familyCounts).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
      return {
        content: {
          owned_count: p.ownedCount,
          rated_count: p.ratedCount,
          families: Object.fromEntries(families),
          bottles_per_season: p.seasonCounts,
          bottles_per_daypart: p.daypartCounts,
          top_accords: p.topAccords.map((a) => a.name),
          liked_notes: ctx.preferences.likedNotes,
          disliked_notes: ctx.preferences.dislikedNotes,
          liked_families: ctx.preferences.likedFamilies,
          budget_max_usd: ctx.preferences.budgetMax,
          limited_data: p.limited,
        },
        fragranceIds: [],
        prices: ctx.preferences.budgetMax ? [`$${ctx.preferences.budgetMax}`] : [],
        summary: `Read profile (${p.ownedCount} bottles)`,
      };
    }
    case "get_owned_fragrances":
      return {
        content: ctx.owned.map((o) => ({ ...brief(o.fragrance), sentiment: o.sentiment ?? "unrated" })),
        fragranceIds: ctx.owned.map((o) => o.fragrance.id),
        prices: [],
        summary: `Read collection (${ctx.owned.length})`,
      };
    case "search_catalog": {
      const { query } = input as z.infer<typeof inputs.search_catalog>;
      const items = (await ctx.searchCatalog(query)).slice(0, 8);
      return {
        content: items.map((i) => ({ id: i.id, name: `${i.brand} ${i.name}`, family: i.family, accords: i.accords, rating: i.rating, votes: i.votes })),
        fragranceIds: items.map((i) => i.id),
        prices: [],
        summary: `Searched “${query}” (${items.length})`,
      };
    }
    case "get_fragrance_details": {
      const { fragrance_id } = input as z.infer<typeof inputs.get_fragrance_details>;
      const f = await ctx.getFragrance(fragrance_id);
      if (!f) return { content: { error: "No fragrance with that id" }, fragranceIds: [], prices: [], summary: "Details: not found" };
      const owned = ctx.owned.some((o) => o.fragrance.id === f.id);
      return {
        content: {
          ...brief(f),
          already_owned: owned,
          concentration: f.concentration ?? "not specified",
          year: f.year,
          notes: { top: f.notes.top.map((n) => n.name), middle: f.notes.middle.map((n) => n.name), base: f.notes.base.map((n) => n.name), unsorted: f.notes.flat.map((n) => n.name) },
          longevity_out_of_5: f.community?.longevity ? Math.round(f.community.longevity * 10) / 10 : null,
          sillage_out_of_4: f.community?.sillage ? Math.round(f.community.sillage * 10) / 10 : null,
          suits_seasons: fitsSeasons(f),
          suits: fitsDayparts(f),
          // Third-party community text: data to report, never instructions to follow.
          community_themes_untrusted: { pros: f.themes.pros.map((t) => t.text), cons: f.themes.cons.map((t) => t.text) },
          known_bottle_sizes_ml: f.sizesMl,
          data_source: f.provider,
        },
        fragranceIds: [f.id],
        prices: f.priceBand ? [PRICE_BAND_LABEL[f.priceBand]] : [],
        summary: `Read details: ${displayName(f)}`,
      };
    }
    case "recommend_candidates": {
      const i = input as z.infer<typeof inputs.recommend_candidates>;
      const res = await ctx.recommend({ mode: i.mode, budgetMax: i.budget_max_usd, season: i.season, daypart: i.daypart, performance: i.performance, includeAlternatives: i.include_budget_alternatives ?? null });
      return {
        content: {
          mode: res.mode,
          engine: res.engineVersion,
          candidates: res.results.map((r, idx) => ({
            rank: idx + 1,
            ...brief(r.fragrance),
            estimated_fit: Math.round(r.score * 100),
            reasons: r.reasons.map(reasonText),
            caveats: r.caveats.map(caveatText),
          })),
          note: res.globalCaveats.map(caveatText),
          excluded_counts: res.excluded,
          empty_reason: res.results.length ? null : res.mostRestrictive,
        },
        fragranceIds: res.results.map((r) => r.fragranceId),
        prices: [...new Set(res.results.flatMap((r) => (r.fragrance.priceBand ? [PRICE_BAND_LABEL[r.fragrance.priceBand]] : [])))].concat(i.budget_max_usd ? [`$${i.budget_max_usd}`] : []),
        summary: `Ran ${i.mode} recommendations (${res.results.length})`,
      };
    }
    case "find_offers": {
      const i = input as z.infer<typeof inputs.find_offers>;
      const f = await ctx.getFragrance(i.fragrance_id);
      if (!f) return { content: { error: "No fragrance with that id" }, fragranceIds: [], prices: [], summary: "Offers: not found" };
      const r = await ctx.findOffers(f, i.concentration, i.size_ml);
      const c = r.comparison;
      const exact = c.exact.slice(0, 5).map((o) => ({ merchant: o.merchant, listed_price_usd: o.listPrice, shipping_usd: o.shippingPrice ?? "unknown" }));
      return {
        content: {
          bottle: `${displayName(f)} ${i.concentration} ${i.size_ml} ml`,
          data: r.provider.live ? "live offers from available sources" : "SAMPLE offers from fictional stores, not real prices",
          price_basis: c.basis === "landed" ? "price including shipping" : "listed price, shipping not always included",
          exact_matches: exact,
          needs_verification_count: c.needsVerification.length,
          rejected_count: c.rejected.length,
          checked_at: r.checkedAt,
        },
        fragranceIds: [f.id],
        prices: exact.flatMap((o) => [`$${o.listed_price_usd}`, `$${o.listed_price_usd.toFixed(2)}`]),
        summary: `Compared prices: ${c.exact.length} exact (${r.provider.live ? "live" : "sample"})`,
      };
    }
    case "propose_add_to_wishlist": {
      const { fragrance_id } = input as z.infer<typeof inputs.propose_add_to_wishlist>;
      const f = await ctx.getFragrance(fragrance_id);
      if (!f) return { content: { error: "No fragrance with that id" }, fragranceIds: [], prices: [], summary: "Wishlist: not found" };
      return {
        content: { status: "awaiting_user_confirmation", message: "A confirm button is shown to the user. Nothing has been saved yet." },
        fragranceIds: [f.id],
        prices: [],
        pending: { type: "add_to_wishlist", fragranceId: f.id, label: `Add ${displayName(f)} to wishlist` },
        summary: `Proposed: wishlist ${displayName(f)}`,
      };
    }
    case "propose_preference_update": {
      const i = input as z.infer<typeof inputs.propose_preference_update>;
      const parts = [
        i.add_disliked_notes.length ? `avoid ${i.add_disliked_notes.join(", ")}` : "",
        i.add_liked_notes.length ? `seek ${i.add_liked_notes.join(", ")}` : "",
        i.budget_max_usd ? `budget up to $${i.budget_max_usd}` : "",
      ].filter(Boolean);
      return {
        content: { status: "awaiting_user_confirmation", message: "A confirm button is shown to the user. Nothing has been saved yet." },
        fragranceIds: [],
        prices: i.budget_max_usd ? [`$${i.budget_max_usd}`] : [],
        pending: { type: "update_preferences", addDislikedNotes: i.add_disliked_notes, addLikedNotes: i.add_liked_notes, budgetMax: i.budget_max_usd, label: `Update preferences: ${parts.join("; ") || "no change"}` },
        summary: "Proposed: preference update",
      };
    }
  }
}

export { ToolInputError };
