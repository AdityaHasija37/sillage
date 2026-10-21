import "server-only";
import { randomBytes } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/admin";
import { claimRate, clientKey } from "@/lib/security/rate";

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
  await db.from("preferences").update({ disliked_notes: DEMO_PREFERENCES.disliked_notes, liked_notes: DEMO_PREFERENCES.liked_notes }).eq("user_id", userId);
  await db.from("profiles").update({ budget_max: DEMO_PREFERENCES.budget_max, onboarded_at: new Date().toISOString() }).eq("user_id", userId);
  return { status: "ok", email, password };
}
