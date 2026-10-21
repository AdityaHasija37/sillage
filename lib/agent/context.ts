import "server-only";
import { getFragrance, searchCatalog } from "@/lib/catalog/service";
import { getPreferences, listCollection } from "@/lib/collection/service";
import { searchOffers } from "@/lib/offers/service";
import { runRecommendations } from "@/lib/recommendation/service";
import type { AdvisorContext } from "./tools";

/** The real, user-scoped advisor context: every read goes through the user's own RLS client. */
export async function advisorContextFor(userId: string): Promise<AdvisorContext> {
  const [owned, preferences] = await Promise.all([listCollection(), getPreferences()]);
  return {
    owned,
    preferences,
    // Advisor search stays on the stored catalog (no live provider calls from the model).
    searchCatalog: async (q) => (await searchCatalog({ q, page: 0 }, null)).items,
    getFragrance,
    recommend: (input) => runRecommendations(input, preferences, owned, "advisor"),
    findOffers: (fragrance, concentration, sizeMl) => searchOffers(fragrance, { fragranceId: fragrance.id, concentration, sizeMl }, userId),
  };
}
