import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Info, Plus } from "lucide-react";
import { ButtonLink } from "@/components/ui/button-link";
import { CoverageGrid, FamilyBars, StatTile } from "@/components/dashboard/charts";
import { FragranceCard } from "@/components/fragrance/fragrance-card";
import { ScentSwatch } from "@/components/fragrance/scent-swatch";
import { accordColor } from "@/lib/domain/accord-colors";
import { listCollection } from "@/lib/collection/service";
import { buildProfile, coverageCells, describeCoverage } from "@/lib/domain/profile";
import { SEASONS } from "@/lib/domain/fragrance";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const owned = await listCollection();
  if (owned.length === 0) return <EmptyDashboard />;

  const profile = buildProfile(owned);
  const cells = coverageCells(owned);
  const familiesOwned = Object.values(profile.familyCounts).filter((n) => n > 0).length;
  const seasonsCovered = SEASONS.filter((s) => profile.seasonCounts[s] > 0).length;
  const toFive = Math.max(0, 5 - owned.length);

  return (
    <div className="grid gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Your collection</p>
          <h1 className="text-4xl font-medium tracking-tight">What your shelf says</h1>
        </div>
        <div className="flex gap-2">
          <ButtonLink variant="outline" href="/app/add">
            <Plus aria-hidden="true" /> Add fragrance
          </ButtonLink>
          <ButtonLink href="/app/discover">
            Find my next fragrance <ArrowRight aria-hidden="true" />
          </ButtonLink>
        </div>
      </header>

      {profile.limited && (
        <p className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/5 px-4 py-3 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
          <span>
            {toFive > 0
              ? `Limited data: these patterns are based on ${owned.length} bottle${owned.length === 1 ? "" : "s"}. Add ${toFive} more for a clearer picture.`
              : "None of your bottles are rated yet. Mark the ones you love or dislike so recommendations reflect taste, not just ownership."}{" "}
            <Link href={toFive > 0 ? "/app/add" : "/app/collection"} className="font-medium underline underline-offset-2">
              {toFive > 0 ? "Add fragrances" : "Rate your collection"}
            </Link>
          </span>
        </p>
      )}

      <section aria-label="Summary" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Bottles" value={String(owned.length)} hint={toFive > 0 ? `${toFive} to reach 5` : undefined} />
        <StatTile label="Families" value={`${familiesOwned}/10`} />
        <StatTile label="Seasons covered" value={`${seasonsCovered}/4`} />
        <StatTile label="Rated" value={`${profile.ratedCount}/${owned.length}`} hint="Ownership isn't taste: rate to sharpen picks" />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border bg-card p-5" aria-labelledby="mix">
          <h2 id="mix" className="text-xl">
            Scent mix
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">Bottles per fragrance family</p>
          <FamilyBars counts={profile.familyCounts} total={owned.length} />
        </section>
        <section className="rounded-2xl border bg-card p-5" aria-labelledby="coverage">
          <h2 id="coverage" className="text-xl">
            When you can wear them
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">Bottles suited to each season and time of day, from community votes</p>
          <CoverageGrid cells={cells} summary={describeCoverage(cells)} />
        </section>
      </div>

      <section className="rounded-2xl border bg-card p-5" aria-labelledby="signature">
        <div className="flex flex-wrap items-start gap-6">
          <ScentSwatch accords={profile.topAccords.map((a) => ({ name: a.name, strength: Math.round(a.weight * 100) }))} size="lg" />
          <div className="min-w-0 flex-1">
            <h2 id="signature" className="text-xl">
              Your signature
            </h2>
            <p className="mb-3 text-sm text-muted-foreground">Accords weighted by how much you like each bottle (loved counts most, disliked counts against)</p>
            <ul className="flex flex-wrap gap-2">
              {profile.topAccords.map((a) => (
                <li key={a.name} className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm capitalize">
                  <span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: accordColor(a.name) }} />
                  {a.name}
                </li>
              ))}
            </ul>
            {profile.topNotes.length > 0 && (
              <p className="mt-4 text-sm text-muted-foreground">
                Notes that keep showing up: <span className="text-foreground">{profile.topNotes.slice(0, 6).map((n) => n.name).join(", ")}</span>
              </p>
            )}
          </div>
        </div>
      </section>

      <section aria-labelledby="recent">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 id="recent" className="text-xl">
            Recently added
          </h2>
          <Link href="/app/collection" className="text-sm text-primary hover:underline">
            See all {owned.length}
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {owned.slice(0, 3).map((o) => (
            <FragranceCard key={o.id} fragrance={{ ...o.fragrance, rating: o.fragrance.community?.rating ?? null, votes: o.fragrance.community?.votes ?? 0 }} />
          ))}
        </div>
      </section>
    </div>
  );
}

function EmptyDashboard() {
  return (
    <div className="mx-auto max-w-xl py-10 text-center">
      <div className="mx-auto mb-6 flex justify-center gap-2" aria-hidden="true">
        <ScentSwatch accords={[{ name: "citrus", strength: 60 }, { name: "aromatic", strength: 40 }]} size="md" />
        <ScentSwatch accords={[{ name: "amber", strength: 60 }, { name: "vanilla", strength: 40 }]} size="md" className="translate-y-3" />
        <ScentSwatch accords={[{ name: "rose", strength: 60 }, { name: "woody", strength: 40 }]} size="md" />
      </div>
      <h1 className="text-4xl font-medium tracking-tight">Start with what&apos;s on your shelf</h1>
      <p className="mt-3 text-muted-foreground">
        Add the fragrances you own. Five is a good start: enough for Sillage to map your taste, spot gaps and recommend what to try next. Search covers about 38,000 fragrances.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <ButtonLink size="lg" href="/app/add">
          <Plus aria-hidden="true" /> Add your first fragrance
        </ButtonLink>
        <ButtonLink size="lg" variant="outline" href="/app/preferences">
          Set preferences first
        </ButtonLink>
      </div>
    </div>
  );
}
