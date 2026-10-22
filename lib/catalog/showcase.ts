import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/database.types";
import { FRAGRANCE_COLUMNS, toFragrance, type Fragrance } from "@/lib/domain/fragrance";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";

/**
 * Real catalog entries for marketing visuals: the most-voted fragrance in each family, so the hero
 * shelf shows a believable, varied collection instead of invented products.
 */
export async function showcaseShelf(count = 10): Promise<Fragrance[]> {
  try {
    const db = createClient<Database>(supabaseUrl(), supabaseAnonKey(), { auth: { persistSession: false } });
    const { data } = await db.from("fragrances").select(FRAGRANCE_COLUMNS).eq("provider", "fragrantica_decant").order("community_votes", { ascending: false }).limit(80);
    const all = (data ?? []).map(toFragrance);
    const seen = new Set<string>();
    const picked: Fragrance[] = [];
    for (const f of all) {
      const key = f.family ?? f.id;
      if (seen.has(key)) continue;
      seen.add(key);
      picked.push(f);
      if (picked.length >= count) break;
    }
    for (const f of all) {
      if (picked.length >= count) break;
      if (!picked.includes(f)) picked.push(f);
    }
    return picked;
  } catch {
    return [];
  }
}
