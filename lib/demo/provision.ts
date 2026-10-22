import "server-only";
import { randomBytes } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/admin";
import { claimRate, clientKey } from "@/lib/security/rate";
import { FRAGRANCE_COLUMNS, toFragrance } from "@/lib/domain/fragrance";
import { LAB_ALGORITHM_VERSION, pairKey, predictPair } from "@/lib/intelligence/lab";
import { toProfile } from "@/lib/intelligence/profile";

export function demoEnabled(): boolean {
  return process.env.DEMO_ENABLED !== "false";
}

/** Six bottles across distinct styles, with explicit sentiments, plus one wishlist item (UX demo spec). */
export const DEMO_COLLECTION: { brand: string; name: string; sentiment: "love" | "like" | "neutral" | null }[] = [
  { brand: "Chanel", name: "Bleu de Chanel Eau de Parfum", sentiment: "love" },
  { brand: "Tom Ford", name: "Tobacco Vanille", sentiment: "love" },
  { brand: "Dior", name: "Sauvage", sentiment: "like" },
  { brand: "Maison Martin Margiela", name: "Jazz Club", sentiment: "like" },
  { brand: "Jo Malone London", name: "Wood Sage & Sea Salt", sentiment: "like" },
  { brand: "Giorgio Armani", name: "Acqua di Gio", sentiment: "neutral" },
];
export const DEMO_WISHLIST = { brand: "Hermès", name: "Terre d'Hermès" };
export const DEMO_PREFERENCES = { disliked_notes: ["oud"], liked_notes: [], budget_max: 150 };
/** Two sample layering experiments (PRD 08 §10), the first with a logged wear result. */
export const DEMO_LAYERING: { a: [string, string]; b: [string, string]; feedback?: { rating: number; perceived_intensity: "soft" | "moderate" | "strong"; would_repeat: boolean } }[] = [
  { a: ["Tom Ford", "Tobacco Vanille"], b: ["Maison Martin Margiela", "Jazz Club"], feedback: { rating: 4, perceived_intensity: "strong", would_repeat: true } },
  { a: ["Chanel", "Bleu de Chanel Eau de Parfum"], b: ["Jo Malone London", "Wood Sage & Sea Salt"] },
];

/**
 * Creates a private, pre-filled sandbox account and returns credentials for an immediate sign-in
 * (same model as Touchline DEC-48). Credentials are never shown. Sandboxes expire after 24 hours;
 * at most 5 per visitor per hour and 300 live overall.
 */
export async function provisionDemo(): Promise<{ status: "ok"; email: string; password: string } | { status: "busy" }> {
  const db = createServiceClient();
  if (!(await claimRate("demo", await clientKey()))) return { status: "busy" };
  const { data: capacity } = await db.rpc("demo_capacity_ok");
  if (!capacity) return { status: "busy" };

  // Opportunistic expiry, no cron: deleting the auth user cascades to all of its data.
  const { data: expired } = await db.rpc("expired_demo_accounts", { p_limit: 20 });
  for (const id of (expired as string[] | null) ?? []) await db.auth.admin.deleteUser(id);

  const email = `demo-${randomBytes(6).toString("hex")}@demo.sillage.invalid`;
  const password = randomBytes(24).toString("base64url");
  const { data: created, error } = await db.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name: "Demo visitor", demo: true } });
  if (error || !created.user) return { status: "busy" };
  const userId = created.user.id;
  await db.from("demo_accounts").insert({ user_id: userId });

  const wanted = [...DEMO_COLLECTION, DEMO_WISHLIST];
  const { data: rows } = await db
    .from("fragrances")
    .select("id, brand, name, community_votes")
    .eq("provider", "fragrantica_decant")
    .in("name", wanted.map((w) => w.name));
  // Several houses reuse names; take the most-voted match per brand + name.
  const pick = (brand: string, name: string) =>
    (rows ?? []).filter((r) => r.brand === brand && r.name === name).sort((a, b) => (b.community_votes ?? 0) - (a.community_votes ?? 0))[0]?.id;

  const items = DEMO_COLLECTION.map((d, i) => ({ id: pick(d.brand, d.name), sentiment: d.sentiment, i })).filter((x) => x.id);
  // Stagger created_at so "recently added" has a stable order.
  const base = Date.now();
  await db.from("collection_items").insert(items.map((x) => ({ user_id: userId, fragrance_id: x.id!, sentiment: x.sentiment, created_at: new Date(base - x.i * 60_000).toISOString() })));
  const wish = pick(DEMO_WISHLIST.brand, DEMO_WISHLIST.name);
  if (wish) await db.from("wishlist_items").insert({ user_id: userId, fragrance_id: wish });
  // Sample layering experiments, computed with the real engine from the sandbox's own bottles.
  const ids = items.map((x) => x.id!) as string[];
  const { data: full } = await db.from("fragrances").select(FRAGRANCE_COLUMNS).in("id", ids);
  const profiles = new Map((full ?? []).map((r) => toFragrance(r)).map((f) => [`${f.brand}|${f.name}`, f]));
  const sentimentOf = new Map(DEMO_COLLECTION.map((d) => [`${d.brand}|${d.name}`, d.sentiment]));
  for (const ex of DEMO_LAYERING) {
    const fa = profiles.get(ex.a.join("|"));
    const fb = profiles.get(ex.b.join("|"));
    if (!fa || !fb) continue;
    const prediction = predictPair({ profile: toProfile(fa), sentiment: sentimentOf.get(ex.a.join("|")) ?? null }, { profile: toProfile(fb), sentiment: sentimentOf.get(ex.b.join("|")) ?? null });
    if (prediction.status !== "ok") continue;
    const { data: saved } = await db
      .from("layering_experiments")
      .insert({ user_id: userId, pair_key: pairKey(fa.id, fb.id), fragrance_a_id: fa.id, fragrance_b_id: fb.id, application_order: "a_first", prediction_json: JSON.parse(JSON.stringify(prediction)), algorithm_version: LAB_ALGORITHM_VERSION })
      .select("id")
      .single();
    if (saved && ex.feedback) await db.from("layering_feedback").insert({ user_id: userId, experiment_id: saved.id, ...ex.feedback, notes: "Sample entry: warm and boozy, lasted all evening." });
  }
  await db.from("preferences").update({ disliked_notes: DEMO_PREFERENCES.disliked_notes, liked_notes: DEMO_PREFERENCES.liked_notes }).eq("user_id", userId);
  await db.from("profiles").update({ budget_max: DEMO_PREFERENCES.budget_max, onboarded_at: new Date().toISOString() }).eq("user_id", userId);
  return { status: "ok", email, password };
}
