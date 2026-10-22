import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, ThumbsDown, ThumbsUp } from "lucide-react";
import { AccordBars, DataQuality, FamilyBadge, Rating } from "@/components/fragrance/bits";
import { FragranceActions } from "@/components/fragrance/fragrance-actions";
import { ScentSwatch } from "@/components/fragrance/scent-swatch";
import { OfferPanel } from "@/components/offers/offer-panel";
import { getFragrance, getFragrancesByExternalIds, SOURCE_LABEL } from "@/lib/catalog/service";
import { listCollection, listWishlist } from "@/lib/collection/service";
import { dayShare, displayName, PRICE_BAND_LABEL, seasonShares, SEASONS } from "@/lib/domain/fragrance";
import { accordVector, cosine } from "@/lib/domain/profile";

export async function generateMetadata({ params }: PageProps<"/app/fragrance/[id]">): Promise<Metadata> {
  const f = await getFragrance((await params).id);
  return { title: f ? displayName(f) : "Fragrance" };
}

const CONC_LABEL = { EDC: "Eau de Cologne", EDT: "Eau de Toilette", EDP: "Eau de Parfum", Parfum: "Parfum", Extrait: "Extrait de Parfum", Elixir: "Elixir", Cologne: "Cologne" } as const;
const SEASON_LABEL = { spring: "Spring", summer: "Summer", fall: "Fall", winter: "Winter" } as const;
const k = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n));

export default async function FragrancePage({ params }: PageProps<"/app/fragrance/[id]">) {
  const { id } = await params;
  const f = await getFragrance(id);
  if (!f) notFound();
  const [owned, wishlist, similar] = await Promise.all([
    listCollection(),
    listWishlist(),
    getFragrancesByExternalIds(f.provider, f.similarTo.slice(0, 6).map((s) => s.externalId)),
  ]);
  const isOwned = owned.some((o) => o.fragrance.id === f.id);
  const isWished = wishlist.some((w) => w.fragrance.id === f.id);
  const v = accordVector(f);
  const closest = owned
    .filter((o) => o.fragrance.id !== f.id)
    .map((o) => ({ o, s: cosine(v, accordVector(o.fragrance)) }))
    .sort((a, b) => b.s - a.s)[0];
  const shares = seasonShares(f);
  const ds = dayShare(f);
  const c = f.community;
  const hasNotes = f.notes.top.length + f.notes.middle.length + f.notes.base.length + f.notes.flat.length > 0;
  const similarById = new Map(similar.map((s) => [s.externalId, s]));

  return (
    <div className="grid gap-12">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/app/collection" className="hover:underline">
          Collection
        </Link>{" "}
        / <span aria-current="page">{f.name}</span>
      </nav>

      <header className="flex flex-wrap items-start gap-8">
        <ScentSwatch name={f.name} accords={f.accords} size="xl" />
        <div className="min-w-0 flex-1">
          <p className="label">{f.brand}</p>
          <h1 className="mt-1 text-5xl leading-[0.95] sm:text-7xl">{f.name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <FamilyBadge family={f.family} />
            {f.familyLabel && <span className="text-muted-foreground capitalize">{f.familyLabel}</span>}
            {f.year && <span className="text-muted-foreground">· {f.year}</span>}
            <span className="text-muted-foreground">· {f.concentration ? CONC_LABEL[f.concentration] : "Concentration not specified"}</span>
            <DataQuality quality={f.dataQuality} />
          </div>
          {f.perfumers.length > 0 && <p className="mt-2 text-sm text-muted-foreground">Perfumer: {f.perfumers.join(", ")}</p>}
          {c && <Rating rating={c.rating} votes={c.votes} className="mt-3 text-sm" />}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <FragranceActions fragranceId={f.id} owned={isOwned} wishlisted={isWished} />
            {!isOwned && (
              <Link href={`/app/score?candidate=${f.id}`} className="text-sm text-primary underline-offset-4 hover:underline">
                What would it change about my shelf?
              </Link>
            )}
          </div>
          {closest && closest.s > 0 && (
            <p className="mt-4 text-sm">
              {closest.s >= 0.8 ? "Very close to" : closest.s >= 0.55 ? "Shares a lot with" : "Closest in your collection:"}{" "}
              <Link href={`/app/fragrance/${closest.o.fragrance.id}`} className="font-medium underline underline-offset-2">
                {displayName(closest.o.fragrance)}
              </Link>{" "}
              <span className="text-muted-foreground">({Math.round(closest.s * 100)}% accord overlap)</span>
            </p>
          )}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="accords-h" className="border-t border-foreground/15 pt-5">
          <h2 id="accords-h" className="mb-4 text-3xl">
            Accords
          </h2>
          {f.accords.length ? <AccordBars accords={f.accords} /> : <p className="text-sm text-muted-foreground">No accord data from this source.</p>}
        </section>
        <section aria-labelledby="notes-h" className="border-t border-foreground/15 pt-5">
          <h2 id="notes-h" className="mb-4 text-3xl">
            Notes
          </h2>
          {hasNotes ? (
            <dl className="grid gap-3 text-sm">
              {(
                [
                  ["Top", f.notes.top],
                  ["Heart", f.notes.middle],
                  ["Base", f.notes.base],
                  ["Notes", f.notes.flat],
                ] as const
              )
                .filter(([, list]) => list.length)
                .map(([label, list]) => (
                  <div key={label} className="grid grid-cols-[4rem_1fr] gap-3">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd>{list.map((n) => n.name).join(", ")}</dd>
                  </div>
                ))}
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">This source doesn&apos;t list notes for this fragrance. Recommendations can&apos;t use it until notes are known.</p>
          )}
        </section>
      </div>

      {c && (
        <section aria-labelledby="community-h" className="border-t border-foreground/15 pt-5">
          <h2 id="community-h" className="text-3xl">
            What wearers report
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">Community votes from {k(c.votes)} people. Estimates, not lab measurements.</p>
          <div className="grid gap-6 md:grid-cols-3">
            <dl className="grid content-start gap-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Longevity</dt>
                <dd className="tabular-nums">{c.longevity ? `${c.longevity.toFixed(1)} / 5` : "Unknown"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Projection (sillage)</dt>
                <dd className="tabular-nums">{c.sillage ? `${c.sillage.toFixed(1)} / 4` : "Unknown"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Value for money</dt>
                <dd className="tabular-nums">{c.priceValue ? `${c.priceValue.toFixed(1)} / 5` : "Unknown"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Day / evening</dt>
                <dd className="tabular-nums">{ds == null ? "Unknown" : `${Math.round(ds * 100)}% / ${Math.round((1 - ds) * 100)}%`}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Own · want</dt>
                <dd className="tabular-nums">
                  {k(c.have ?? 0)} · {k(c.want ?? 0)}
                </dd>
              </div>
            </dl>
            <div>
              <h3 className="mb-2 font-sans text-sm font-medium">Seasons</h3>
              {shares ? (
                <ul className="grid gap-1.5" aria-label="Share of season votes">
                  {SEASONS.map((s) => (
                    <li key={s} className="grid grid-cols-[4rem_1fr_2.5rem] items-center gap-2 text-sm">
                      <span>{SEASON_LABEL[s]}</span>
                      <span className="h-2 rounded-full bg-muted" aria-hidden="true">
                        <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.round(shares[s] * 100 * 2)}%`, maxWidth: "100%" }} />
                      </span>
                      <span className="text-right text-xs text-muted-foreground tabular-nums">{Math.round(shares[s] * 100)}%</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No season votes.</p>
              )}
            </div>
            <div>
              <h3 className="mb-2 font-sans text-sm font-medium">Common themes in reviews</h3>
              {f.themes.pros.length + f.themes.cons.length === 0 ? (
                <p className="text-sm text-muted-foreground">Not enough reviews summarised.</p>
              ) : (
                <ul className="grid gap-1.5 text-sm">
                  {f.themes.pros.map((t) => (
                    <li key={t.text} className="flex gap-2">
                      <ThumbsUp className="mt-0.5 size-3.5 shrink-0 text-success" aria-label="Positive" />
                      <span>
                        {t.text} <span className="text-xs text-muted-foreground">({k(t.agree)} agree)</span>
                      </span>
                    </li>
                  ))}
                  {f.themes.cons.map((t) => (
                    <li key={t.text} className="flex gap-2">
                      <ThumbsDown className="mt-0.5 size-3.5 shrink-0 text-destructive" aria-label="Negative" />
                      <span>
                        {t.text} <span className="text-xs text-muted-foreground">({k(t.agree)} agree)</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2 text-xs text-muted-foreground">Themes are AI summaries of Fragrantica reviews, with how many members agreed.</p>
            </div>
          </div>
        </section>
      )}

      {f.similarTo.length > 0 && similar.length > 0 && (
        <section aria-labelledby="similar-h">
          <h2 id="similar-h" className="mb-3 text-3xl">
            People say it smells like
          </h2>
          <ul className="flex flex-wrap gap-2">
            {f.similarTo
              .filter((s) => similarById.has(s.externalId))
              .map((s) => {
                const sf = similarById.get(s.externalId)!;
                return (
                  <li key={s.externalId}>
                    <Link href={`/app/fragrance/${sf.id}`} className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-sm hover:bg-muted">
                      {displayName(sf)} <span className="text-xs text-muted-foreground">{k(s.agree)} votes</span>
                    </Link>
                  </li>
                );
              })}
          </ul>
        </section>
      )}

      <OfferPanel fragranceId={f.id} concentration={f.concentration} knownSizes={f.sizesMl} />

      <footer className="border-t border-dashed pt-4 text-xs leading-relaxed text-muted-foreground">
        <p>
          <span className="font-medium text-foreground">Source:</span> {SOURCE_LABEL[f.provider] ?? f.provider}.{" "}
          {f.sourceUrl && (
            <a href={f.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 underline underline-offset-2">
              View original page <ExternalLink className="size-3" aria-hidden="true" />
            </a>
          )}
        </p>
        <p className="mt-1">
          <span className="font-medium text-foreground">Estimated price band:</span> {f.priceBand ? `${PRICE_BAND_LABEL[f.priceBand]}, estimated from the brand's typical pricing, not a quote.` : "unknown."}
        </p>
      </footer>
    </div>
  );
}
