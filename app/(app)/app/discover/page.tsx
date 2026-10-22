import type { Metadata } from "next";
import { Discover } from "@/components/discover/discover";
import { getPreferences, listCollection } from "@/lib/collection/service";
import { MODES, type Mode } from "@/lib/recommendation/engine";
import { SEASONS, type Season } from "@/lib/domain/fragrance";

export const metadata: Metadata = { title: "Discover" };

export default async function DiscoverPage({ searchParams }: PageProps<"/app/discover">) {
  const [owned, prefs, params] = await Promise.all([listCollection(), getPreferences(), searchParams]);
  const mode = (MODES as readonly string[]).includes(String(params.mode)) ? (params.mode as Mode) : "similar";
  const season = (SEASONS as readonly string[]).includes(String(params.season)) ? (params.season as Season) : "";
  const daypart = params.daypart === "day" || params.daypart === "night" ? params.daypart : "";
  return (
    <div className="grid gap-6">
      <header>
        <p className="label">Discover</p>
        <h1 className="mt-2 text-5xl sm:text-6xl">
          Find your <em className="text-primary">next bottle.</em>
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">Ranked against your {owned.length} bottle{owned.length === 1 ? "" : "s"} and your preferences. Every pick says why, and what&apos;s uncertain.</p>
      </header>
      <Discover defaultBudget={prefs.budgetMax} ownedCount={owned.length} initialMode={mode} defaultIncludeAlternatives={prefs.includeAlternatives} initialSeason={season} initialDaypart={daypart} />
    </div>
  );
}
