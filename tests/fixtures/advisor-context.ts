import type { AdvisorContext } from "@/lib/agent/tools";
import { EMPTY_PREFERENCES } from "@/lib/domain/profile";
import { collectionScore } from "@/lib/intelligence/score";
import { dailyPick } from "@/lib/intelligence/daily";
import { toProfile } from "@/lib/intelligence/profile";
import { recommendCandidates } from "@/lib/recommendation/engine";
import { compareOffers } from "@/lib/offers/match";
import { SampleOfferProvider } from "@/lib/offers/providers";
import { fixtureCatalog, own } from "./fragrances";

/** One shared catalog: fixture ids are random per call, so tests and the context must use the same one. */
export const c = fixtureCatalog();
const catalog = Object.values(c);

/** An advisor context over the fixture catalog: two owned fresh bottles, default preferences. */
export function context(over: Partial<AdvisorContext> = {}): AdvisorContext {
  const owned = [own(c.freshCitrus, "love"), own(c.freshAquatic, "like")];
  return {
    owned,
    preferences: EMPTY_PREFERENCES,
    searchCatalog: async (q) => catalog.filter((f) => f.name.toLowerCase().includes(q.toLowerCase())).map((f) => ({ id: f.id, brand: f.brand, name: f.name, family: f.family, concentration: f.concentration, year: f.year, accords: [], rating: 4, votes: 100, source: "fixture", dataQuality: "partial", imageUrl: null })),
    getFragrance: async (id) => catalog.find((f) => f.id === id) ?? null,
    recommend: async (i) => ({ ...recommendCandidates(i, EMPTY_PREFERENCES, owned, catalog), runId: null }),
    findOffers: async (f, concentration, sizeMl) => {
      const target = { brand: f.brand, name: f.name, concentration, sizeMl };
      return { target, comparison: compareOffers(target, await new SampleOfferProvider(f.priceBand).searchOffers(target)), provider: { id: "sample", label: "Sample", live: false }, checkedAt: new Date().toISOString(), fromCache: false, notice: "no_live_key" };
    },
    collectionScore: async () => collectionScore(owned.map((o) => toProfile(o.fragrance))),
    dailyPick: async (context) => dailyPick(context, owned.map((o) => ({ profile: toProfile(o.fragrance), sentiment: o.sentiment, dislikedNoteHit: false }))),
    ...over,
  };
}
