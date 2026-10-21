import type { Metadata } from "next";
import { Discover } from "@/components/discover/discover";
import { getPreferences, listCollection } from "@/lib/collection/service";
import { MODES, type Mode } from "@/lib/recommendation/engine";

export const metadata: Metadata = { title: "Discover" };

export default async function DiscoverPage({ searchParams }: PageProps<"/app/discover">) {
  const [owned, prefs, params] = await Promise.all([listCollection(), getPreferences(), searchParams]);
  const mode = (MODES as readonly string[]).includes(String(params.mode)) ? (params.mode as Mode) : "similar";
  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-4xl font-medium tracking-tight">Find your next fragrance</h1>
        <p className="mt-2 text-muted-foreground">Ranked against your {owned.length} bottle{owned.length === 1 ? "" : "s"} and your preferences. Every pick says why, and what&apos;s uncertain.</p>
      </header>
      <Discover defaultBudget={prefs.budgetMax} ownedCount={owned.length} initialMode={mode} defaultIncludeAlternatives={prefs.includeAlternatives} />
    </div>
  );
}
