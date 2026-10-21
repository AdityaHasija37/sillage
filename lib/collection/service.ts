import "server-only";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { CONCENTRATIONS, FAMILIES, FRAGRANCE_COLUMNS, toFragrance, type Fragrance } from "@/lib/domain/fragrance";
import { EMPTY_PREFERENCES, SENTIMENTS, type OwnedFragrance, type Preferences, type Sentiment } from "@/lib/domain/profile";

export type CollectionItem = OwnedFragrance & {
  id: string;
  variant: { id: string; concentration: string; sizeMl: number } | null;
  createdAt: string;
};

export type WishlistItem = { id: string; fragrance: Fragrance; variant: { id: string; concentration: string; sizeMl: number } | null; createdAt: string };

const JOIN = `id, sentiment, rating, created_at, variant:variants(id, concentration, size_ml), fragrance:fragrances(${FRAGRANCE_COLUMNS})`;

type JoinedRow = {
  id: string;
  sentiment?: string | null;
  rating?: number | null;
  created_at: string;
  variant: { id: string; concentration: string; size_ml: number } | null;
  fragrance: unknown;
};

const toVariant = (v: JoinedRow["variant"]) => (v ? { id: v.id, concentration: v.concentration, sizeMl: Number(v.size_ml) } : null);

export async function listCollection(): Promise<CollectionItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("collection_items").select(JOIN).order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as JoinedRow[]).map((r) => ({
    id: r.id,
    fragrance: toFragrance(r.fragrance),
    sentiment: (r.sentiment ?? null) as Sentiment | null,
    rating: r.rating ?? null,
    variant: toVariant(r.variant),
    createdAt: r.created_at,
  }));
}

export async function listWishlist(): Promise<WishlistItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("wishlist_items")
    .select(`id, created_at, variant:variants(id, concentration, size_ml), fragrance:fragrances(${FRAGRANCE_COLUMNS})`)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as JoinedRow[]).map((r) => ({ id: r.id, fragrance: toFragrance(r.fragrance), variant: toVariant(r.variant), createdAt: r.created_at }));
}

export const AddInput = z.object({
  fragranceId: z.string().uuid(),
  sentiment: z.enum(SENTIMENTS).nullable().optional(),
});

export type MutationResult = { ok: true } | { ok: false; error: string };

export async function addToCollection(input: z.input<typeof AddInput>): Promise<MutationResult> {
  const parsed = AddInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid fragrance" };
  const supabase = await createClient();
  const { error } = await supabase.from("collection_items").insert({ fragrance_id: parsed.data.fragranceId, sentiment: parsed.data.sentiment ?? null });
  if (error?.code === "23505") return { ok: false, error: "Already in your collection" };
  if (error) return { ok: false, error: "Couldn't add it. Try again." };
  return { ok: true };
}

export const UpdateItemInput = z.object({
  id: z.string().uuid(),
  sentiment: z.enum(SENTIMENTS).nullable().optional(),
  rating: z.number().int().min(1).max(10).nullable().optional(),
});

export async function updateCollectionItem(input: z.input<typeof UpdateItemInput>): Promise<MutationResult> {
  const parsed = UpdateItemInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid update" };
  const { id, ...patch } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("collection_items").update(patch).eq("id", id);
  return error ? { ok: false, error: "Couldn't save. Try again." } : { ok: true };
}

export async function removeFromCollection(id: string): Promise<MutationResult> {
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Invalid item" };
  const supabase = await createClient();
  const { error } = await supabase.from("collection_items").delete().eq("id", id);
  return error ? { ok: false, error: "Couldn't remove it." } : { ok: true };
}

export async function addToWishlist(fragranceId: string, variantId: string | null = null): Promise<MutationResult> {
  if (!z.string().uuid().safeParse(fragranceId).success) return { ok: false, error: "Invalid fragrance" };
  const supabase = await createClient();
  const { error } = await supabase.from("wishlist_items").insert({ fragrance_id: fragranceId, variant_id: variantId });
  if (error?.code === "23505") return { ok: false, error: "Already on your wishlist" };
  return error ? { ok: false, error: "Couldn't save it. Try again." } : { ok: true };
}

export async function removeFromWishlist(id: string): Promise<MutationResult> {
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Invalid item" };
  const supabase = await createClient();
  const { error } = await supabase.from("wishlist_items").delete().eq("id", id);
  return error ? { ok: false, error: "Couldn't remove it." } : { ok: true };
}

/** Bought it: add to the collection (unrated) and drop it from the wishlist. */
export async function moveWishlistToOwned(id: string): Promise<MutationResult> {
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Invalid item" };
  const supabase = await createClient();
  const { data: item } = await supabase.from("wishlist_items").select("fragrance_id, variant_id").eq("id", id).maybeSingle();
  if (!item) return { ok: false, error: "Not on your wishlist" };
  const { error } = await supabase.from("collection_items").insert({ fragrance_id: item.fragrance_id, variant_id: item.variant_id });
  if (error && error.code !== "23505") return { ok: false, error: "Couldn't move it." };
  await supabase.from("wishlist_items").delete().eq("id", id);
  return { ok: true };
}

export const PreferencesInput = z.object({
  likedNotes: z.array(z.string().trim().min(1).max(40)).max(40),
  dislikedNotes: z.array(z.string().trim().min(1).max(40)).max(40),
  likedFamilies: z.array(z.enum(FAMILIES)).max(10),
  seasons: z.array(z.enum(["spring", "summer", "fall", "winter"])).max(4),
  occasions: z.array(z.enum(["day", "night"])).max(2),
  performance: z.object({ longevity: z.enum(["soft", "moderate", "strong"]).optional(), projection: z.enum(["soft", "moderate", "strong"]).optional() }),
  budgetMax: z.number().int().min(10).max(5000).nullable(),
  marketedFor: z.enum(["any", "men", "women"]),
});

export async function getPreferences(): Promise<Preferences> {
  const supabase = await createClient();
  const [{ data: p }, { data: prof }] = await Promise.all([
    supabase.from("preferences").select("liked_notes, disliked_notes, liked_families, seasons, occasions, performance, marketed_for").maybeSingle(),
    supabase.from("profiles").select("budget_max").maybeSingle(),
  ]);
  if (!p) return { ...EMPTY_PREFERENCES, budgetMax: prof?.budget_max ?? null };
  const parsed = PreferencesInput.safeParse({
    likedNotes: p.liked_notes,
    dislikedNotes: p.disliked_notes,
    likedFamilies: p.liked_families,
    seasons: p.seasons,
    occasions: p.occasions,
    performance: p.performance,
    budgetMax: prof?.budget_max ?? null,
    marketedFor: p.marketed_for,
  });
  return parsed.success ? parsed.data : { ...EMPTY_PREFERENCES, budgetMax: prof?.budget_max ?? null };
}

export async function savePreferences(input: z.input<typeof PreferencesInput>): Promise<MutationResult> {
  const parsed = PreferencesInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Some preferences weren't valid" };
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return { ok: false, error: "Sign in again" };
  const v = parsed.data;
  const dedupe = (a: string[]) => [...new Set(a.map((s) => s.toLowerCase()))];
  const [{ error: e1 }, { error: e2 }] = await Promise.all([
    supabase.from("preferences").upsert({
      user_id: userId,
      liked_notes: dedupe(v.likedNotes),
      disliked_notes: dedupe(v.dislikedNotes),
      liked_families: v.likedFamilies,
      seasons: v.seasons,
      occasions: v.occasions,
      performance: v.performance,
      marketed_for: v.marketedFor,
      updated_at: new Date().toISOString(),
    }),
    supabase.from("profiles").update({ budget_max: v.budgetMax }).eq("user_id", userId),
  ]);
  return e1 || e2 ? { ok: false, error: "Couldn't save preferences" } : { ok: true };
}

export const VariantInput = z.object({ fragranceId: z.string().uuid(), concentration: z.enum(CONCENTRATIONS), sizeMl: z.number().min(1).max(1000) });

export async function ensureVariant(input: z.input<typeof VariantInput>): Promise<string | null> {
  const parsed = VariantInput.safeParse(input);
  if (!parsed.success) return null;
  const supabase = await createClient();
  const { data } = await supabase.rpc("ensure_variant", { p_fragrance_id: parsed.data.fragranceId, p_concentration: parsed.data.concentration, p_size_ml: parsed.data.sizeMl });
  return (data as string | null) ?? null;
}
