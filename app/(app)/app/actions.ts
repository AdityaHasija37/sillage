"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { getFragrance } from "@/lib/catalog/service";
import {
  addToCollection,
  addToWishlist,
  getPreferences,
  listCollection,
  moveWishlistToOwned,
  removeFromCollection,
  removeFromWishlist,
  savePreferences,
  updateCollectionItem,
  type MutationResult,
} from "@/lib/collection/service";
import { displayName, type Fragrance } from "@/lib/domain/fragrance";
import type { Sentiment } from "@/lib/domain/profile";
import { searchOffers } from "@/lib/offers/service";
import { mainReason, REASON_LABEL, type OfferFlag } from "@/lib/offers/match";
import { caveatText, reasonText } from "@/lib/recommendation/explain";
import { runRecommendations, type RecommendationInput } from "@/lib/recommendation/service";
import { createClient } from "@/lib/supabase/server";
import { toSummary, type FragranceSummary } from "@/lib/catalog/service";
import type { PendingAction } from "@/lib/agent/tools";

const refresh = () => revalidatePath("/app", "layout");

export async function addFragranceAction(fragranceId: string, sentiment: Sentiment | null = null): Promise<MutationResult> {
  await requireUser();
  const r = await addToCollection({ fragranceId, sentiment });
  if (r.ok) refresh();
  return r;
}

export async function updateItemAction(input: { id: string; sentiment?: Sentiment | null; rating?: number | null }): Promise<MutationResult> {
  await requireUser();
  const r = await updateCollectionItem(input);
  if (r.ok) refresh();
  return r;
}

export async function setSentimentByFragranceAction(fragranceId: string, sentiment: Sentiment): Promise<MutationResult> {
  await requireUser();
  if (!z.string().uuid().safeParse(fragranceId).success) return { ok: false, error: "Invalid fragrance" };
  const supabase = await createClient();
  const { data } = await supabase.from("collection_items").select("id").eq("fragrance_id", fragranceId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!data) return { ok: false, error: "Not in your collection" };
  return updateItemAction({ id: data.id, sentiment });
}

export async function removeItemAction(id: string): Promise<MutationResult> {
  await requireUser();
  const r = await removeFromCollection(id);
  if (r.ok) refresh();
  return r;
}

export async function addWishlistAction(fragranceId: string): Promise<MutationResult> {
  await requireUser();
  const r = await addToWishlist(fragranceId);
  if (r.ok) refresh();
  return r;
}

export async function removeWishlistAction(id: string): Promise<MutationResult> {
  await requireUser();
  const r = await removeFromWishlist(id);
  if (r.ok) refresh();
  return r;
}

export async function moveWishlistAction(id: string): Promise<MutationResult> {
  await requireUser();
  const r = await moveWishlistToOwned(id);
  if (r.ok) refresh();
  return r;
}

export async function savePreferencesAction(input: Parameters<typeof savePreferences>[0]): Promise<MutationResult> {
  await requireUser();
  const r = await savePreferences(input);
  if (r.ok) refresh();
  return r;
}

// ── Discover ────────────────────────────────────────────────────────────────

export type RecommendationCard = {
  fragrance: FragranceSummary & { priceBand: Fragrance["priceBand"]; seasons: string[] };
  score: number;
  components: { preference: number; objective: number; budget: number; context: number; performance: number };
  reasons: string[];
  caveats: string[];
};

export type DiscoverResponse =
  | { ok: true; runId: string | null; cards: RecommendationCard[]; globalCaveats: string[]; mostRestrictive: string | null; excluded: Record<string, number>; considered: number; ownedCount: number }
  | { ok: false; error: string };

export async function discoverAction(input: RecommendationInput): Promise<DiscoverResponse> {
  await requireUser();
  try {
    const [owned, preferences] = await Promise.all([listCollection(), getPreferences()]);
    const res = await runRecommendations(input, preferences, owned);
    return {
      ok: true,
      runId: res.runId,
      cards: res.results.map((r) => ({
        fragrance: { ...toSummary(r.fragrance), priceBand: r.fragrance.priceBand, seasons: seasonsOf(r.fragrance) },
        score: r.score,
        components: r.components,
        reasons: r.reasons.map(reasonText),
        caveats: r.caveats.map(caveatText),
      })),
      globalCaveats: res.globalCaveats.map(caveatText),
      mostRestrictive: res.mostRestrictive,
      excluded: res.excluded,
      considered: res.considered,
      ownedCount: owned.length,
    };
  } catch {
    return { ok: false, error: "Recommendations are unavailable right now. Your collection is unaffected; try again shortly." };
  }
}

function seasonsOf(f: Fragrance): string[] {
  const s = f.community?.seasons;
  if (!s) return [];
  const entries = Object.entries(s).map(([k, v]) => [k, v ?? 0] as const);
  const max = Math.max(...entries.map(([, v]) => v));
  return max > 0 ? entries.filter(([, v]) => v >= max * 0.6).map(([k]) => k) : [];
}

export async function feedbackAction(runId: string, fragranceId: string, reaction: "relevant" | "not_relevant"): Promise<MutationResult> {
  await requireUser();
  const parsed = z.object({ runId: z.string().uuid(), fragranceId: z.string().uuid(), reaction: z.enum(["relevant", "not_relevant"]) }).safeParse({ runId, fragranceId, reaction });
  if (!parsed.success) return { ok: false, error: "Invalid feedback" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("recommendation_feedback")
    .upsert({ run_id: runId, fragrance_id: fragranceId, reaction }, { onConflict: "run_id,fragrance_id" });
  return error ? { ok: false, error: "Couldn't save feedback" } : { ok: true };
}

// ── Offers ──────────────────────────────────────────────────────────────────

export type OfferRow = { merchant: string; title: string; url: string; listPrice: number; shippingPrice: number | null; landed: number | null; reasons: string[]; flags: OfferFlag[] };
export type HiddenRow = { merchant: string; title: string; listPrice: number; reason: string };
export type OffersResponse =
  | {
      ok: true;
      bottle: string;
      provider: { label: string; live: boolean };
      checkedAt: string;
      fromCache: boolean;
      notice: string | null;
      basis: "landed" | "listed";
      shippingUnknownCount: number;
      exact: OfferRow[];
      needsVerification: OfferRow[];
      rejected: { reason: string; count: number }[];
      hidden: HiddenRow[];
    }
  | { ok: false; error: string };

const NOTICE: Record<string, string> = {
  no_live_key: "Live price search isn't connected in this deployment, so these are sample offers from fictional stores. They show how matching works; they are not real prices.",
  rate_limited: "You've reached the hourly limit for live price checks, so these are sample offers, not real prices.",
  provider_error: "The live price source didn't respond, so these are sample offers, not real prices. Try again later.",
  quota: "The live price source's monthly quota is used up, so these are sample offers, not real prices.",
};

export async function compareOffersAction(input: { fragranceId: string; concentration: string; sizeMl: number }): Promise<OffersResponse> {
  const user = await requireUser();
  const fragrance = await getFragrance(input.fragranceId);
  if (!fragrance) return { ok: false, error: "Fragrance not found" };
  try {
    const r = await searchOffers(fragrance, input as never, user.id);
    const row = (o: (typeof r.comparison.exact)[number]): OfferRow => ({
      merchant: o.merchant,
      title: o.title,
      url: o.url,
      listPrice: o.listPrice,
      shippingPrice: o.shippingPrice,
      landed: o.shippingPrice == null ? null : Math.round((o.listPrice + o.shippingPrice + (o.taxPrice ?? 0)) * 100) / 100,
      reasons: o.reasons.map((x) => REASON_LABEL[x]),
      flags: o.flags,
    });
    return {
      ok: true,
      bottle: `${displayName(fragrance)}, ${r.target.concentration}, ${r.target.sizeMl} ml`,
      provider: { label: r.provider.label, live: r.provider.live },
      checkedAt: r.checkedAt,
      fromCache: r.fromCache,
      notice: r.notice ? NOTICE[r.notice] : null,
      basis: r.comparison.basis,
      shippingUnknownCount: r.comparison.shippingUnknownCount,
      exact: r.comparison.exact.map(row),
      needsVerification: r.comparison.needsVerification.map(row),
      rejected: Object.entries(r.comparison.rejectedSummary).map(([reason, count]) => ({ reason: REASON_LABEL[reason as keyof typeof REASON_LABEL], count: count! })),
      // What was filtered out, so anyone can check the matcher's call (no links: these aren't offers).
      hidden: r.comparison.rejected.slice(0, 60).map((o) => ({
        merchant: o.merchant,
        title: o.title,
        listPrice: o.listPrice,
        reason: REASON_LABEL[mainReason(o.reasons)],
      })),
    };
  } catch {
    return { ok: false, error: "Price comparison is unavailable right now. No offers were found or shown." };
  }
}

// ── Advisor confirmations (the only way an advisor suggestion is ever saved) ──

export async function confirmAdvisorAction(action: PendingAction): Promise<MutationResult> {
  await requireUser();
  if (action.type === "add_to_wishlist") return addWishlistAction(action.fragranceId);
  const prefs = await getPreferences();
  const merge = (a: string[], b: string[]) => [...new Set([...a, ...b.map((s) => s.toLowerCase())])];
  return savePreferencesAction({
    ...prefs,
    dislikedNotes: merge(prefs.dislikedNotes, action.addDislikedNotes).slice(0, 40),
    likedNotes: merge(prefs.likedNotes, action.addLikedNotes).slice(0, 40),
    budgetMax: action.budgetMax ?? prefs.budgetMax,
  });
}
