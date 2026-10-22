import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FlaskConical, Plus, Scale, Sun } from "lucide-react";
import { CoverageGrid, FamilyBars } from "@/components/dashboard/charts";
import { ScentSwatch } from "@/components/fragrance/scent-swatch";
import { ScorePanel } from "@/components/intelligence/score-panel";
import { getUser } from "@/lib/auth/session";
import { listCollection } from "@/lib/collection/service";
import { buildProfile, coverageCells, describeCoverage, type OwnedFragrance } from "@/lib/domain/profile";
import { getCollectionScore } from "@/lib/intelligence/service";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Your shelf" };

const SENTIMENT_MARK = { love: "♥", like: "+", neutral: "·", dislike: "–" } as const;

export default async function ShelfPage() {
  const user = await getUser();
  const supabase = await createClient();
  const [owned, score, { count: experiments }] = await Promise.all([
    listCollection(),
    getCollectionScore(user?.isDemo ?? false),
    supabase.from("layering_experiments").select("id", { count: "exact", head: true }),
  ]);
  if (owned.length === 0) return <EmptyShelf />;

  const profile = buildProfile(owned);
  const cells = coverageCells(owned);
  const rows: (typeof owned)[] = [];
  for (let i = 0; i < owned.length; i += 6) rows.push(owned.slice(i, i + 6));

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-14">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="label">Your shelf</p>
          <h1 className="mt-2 text-5xl sm:text-6xl">
            {owned.length} bottle{owned.length === 1 ? "" : "s"},{" "}
            <em className="text-primary">{profile.topAccords.slice(0, 2).map((a) => a.name).join(" & ") || "still taking shape"}</em>
          </h1>
          <p className="mt-3 max-w-xl text-muted-foreground">
            {profile.limited
              ? owned.length < 5
                ? `Add ${5 - owned.length} more for a clearer picture; rate the ones you have so Sillage learns what you like, not just what you own.`
                : "Rate what you own: love, like or dislike. Ownership alone says little about taste."
              : "Your signature accords, weighted by how much you like each bottle."}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/app/add" className="inline-flex h-10 items-center gap-1.5 rounded-full bg-ink px-4 text-sm text-ink-foreground hover:bg-[color-mix(in_oklch,var(--ink),white_12%)]">
            <Plus className="size-4" aria-hidden="true" /> Add a bottle
          </Link>
          <Link href="/app/collection" className="inline-flex h-10 items-center rounded-full border border-foreground/25 px-4 text-sm hover:border-foreground">
            Manage
          </Link>
        </div>
      </header>

      <section aria-label="Your bottles" className="grain overflow-hidden rounded-md border bg-card/70 px-2 pt-8 pb-5 sm:px-8">
        {rows.map((row, r) => (
          <div key={r} className={r ? "mt-12" : ""}>
            <ul className="shelf flex items-end justify-around gap-3 px-2">
              {row.map((o) => (
                <li key={o.id}>
                  <Link href={`/app/fragrance/${o.fragrance.id}`} className="group block rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none" aria-label={`${o.fragrance.brand} ${o.fragrance.name}`}>
                    <ScentSwatch name={o.fragrance.name} accords={o.fragrance.accords} size="md" className="-mb-px h-16 w-11 transition-transform duration-300 group-hover:-translate-y-1.5 sm:h-24 sm:w-[4.5rem]" />
                  </Link>
                </li>
              ))}
            </ul>
            <ul className="mt-2 flex justify-around gap-3 px-2" aria-hidden="true">
              {row.map((o) => (
                <li key={o.id} className="w-11 text-center sm:w-[4.5rem]">
                  <span className="block truncate font-mono text-[9px] tracking-wide text-muted-foreground uppercase">{o.fragrance.name}</span>
                  <span className="text-xs text-primary">{o.sentiment ? SENTIMENT_MARK[o.sentiment] : ""}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <ScorePanel score={score} />
        <div className="grid content-start gap-4">
          <Link href="/app/today" className="group rounded-md bg-ink p-6 text-ink-foreground transition-colors hover:bg-[color-mix(in_oklch,var(--ink),white_6%)]">
            <Sun className="size-5 text-[oklch(0.8_0.1_55)]" aria-hidden="true" />
            <p className="mt-3 font-heading text-3xl leading-tight">What should I wear today?</p>
            <p className="mt-2 text-sm text-ink-foreground/70">Tell it the occasion and the weather; it picks from your own shelf and says why.</p>
            <span className="mt-4 inline-flex items-center gap-1 font-mono text-[11px] tracking-[0.08em] uppercase">
              Pick for today <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </span>
          </Link>
          <FeatureLink href="/app/score" icon={Scale} title="Thinking about a new bottle?" body="See what it would change about your score before you buy, including where it overlaps what you own." />
          <FeatureLink href="/app/lab" icon={FlaskConical} title="Scent Lab" body={experiments ? `${experiments} layering experiment${experiments === 1 ? "" : "s"} saved. Try another pairing, or log how one wore.` : "Pair two of your bottles, see a predicted blend, then log how it actually wore."} />
        </div>
      </div>

      <section aria-labelledby="reach-h" className="grid gap-8 lg:grid-cols-2">
        <h2 id="reach-h" className="sr-only">
          Where your shelf reaches
        </h2>
        <div>
          <p className="label">Scent mix</p>
          <p className="mt-1 mb-5 font-heading text-2xl">Bottles per family</p>
          <FamilyBars counts={profile.familyCounts} total={owned.length} />
        </div>
        <div>
          <p className="label">Wardrobe</p>
          <p className="mt-1 mb-5 font-heading text-2xl">When you can wear them</p>
          <CoverageGrid cells={cells} summary={describeCoverage(cells)} />
        </div>
      </section>

      <RecentlyAdded owned={owned.slice(0, 4)} />
    </div>
  );
}

function FeatureLink({ href, icon: Icon, title, body }: { href: string; icon: typeof Sun; title: string; body: string }) {
  return (
    <Link href={href} className="group flex gap-4 rounded-md border bg-card p-5 transition-colors hover:border-foreground/40">
      <Icon className="mt-1 size-5 shrink-0 text-primary" aria-hidden="true" />
      <span>
        <span className="block font-heading text-xl">{title}</span>
        <span className="mt-1 block text-sm text-muted-foreground">{body}</span>
      </span>
    </Link>
  );
}

function RecentlyAdded({ owned }: { owned: (OwnedFragrance & { id: string })[] }) {
  return (
    <section aria-labelledby="recent-h">
      <div className="mb-4 flex items-baseline justify-between border-b pb-2">
        <h2 id="recent-h" className="text-2xl">
          Recently added
        </h2>
        <Link href="/app/collection" className="text-sm text-primary hover:underline">
          Manage collection
        </Link>
      </div>
      <ul className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
        {owned.map((o) => (
          <li key={o.id} className="flex items-center gap-4">
            <ScentSwatch name={o.fragrance.name} accords={o.fragrance.accords} size="sm" />
            <div className="min-w-0">
              <p className="label">{o.fragrance.brand}</p>
              <Link href={`/app/fragrance/${o.fragrance.id}`} className="font-heading text-xl hover:underline">
                {o.fragrance.name}
              </Link>
              <p className="truncate text-xs text-muted-foreground">{o.fragrance.accords.slice(0, 3).map((a) => a.name).join(" · ")}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function EmptyShelf() {
  return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <div className="shelf mx-auto mb-10 flex max-w-xs items-end justify-center gap-6 pb-0">
        {[["citrus", "aromatic"], ["amber", "vanilla"], ["rose", "woody"]].map(([a, b], i) => (
          <ScentSwatch key={i} name={`${a}${b}`} accords={[{ name: a, strength: 60 }, { name: b, strength: 40 }]} size="md" className="-mb-px opacity-40" />
        ))}
      </div>
      <p className="label">An empty shelf</p>
      <h1 className="mt-3 text-5xl">Start with what you own</h1>
      <p className="mt-4 text-muted-foreground">Add the bottles on your shelf; five is a good start. Search covers about 38,000 fragrances, typos and all.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/app/add" className="inline-flex h-11 items-center gap-1.5 rounded-full bg-ink px-5 text-ink-foreground">
          <Plus className="size-4" aria-hidden="true" /> Add your first bottle
        </Link>
        <Link href="/app/preferences" className="inline-flex h-11 items-center rounded-full border border-foreground/25 px-5">
          Set preferences first
        </Link>
      </div>
    </div>
  );
}
