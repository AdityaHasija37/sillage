"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { AlertTriangle, ChevronDown, Heart, ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { addWishlistAction, discoverAction, feedbackAction, type DiscoverResponse, type RecommendationCard } from "@/app/(app)/app/actions";
import { FAMILY_LABEL, PRICE_BAND_LABEL, type Season } from "@/lib/domain/fragrance";
import { MODE_WEIGHTS, type Mode } from "@/lib/recommendation/engine";
import { MODE_LABEL, RELAXATION } from "@/lib/recommendation/explain";
import { cn } from "@/lib/utils";
import { ScentSwatch } from "@/components/fragrance/scent-swatch";
import { Rating } from "@/components/fragrance/bits";

const MODE_NUMERAL = { similar: "i", different: "ii", gaps: "iii" } as const;
const selectClass = "h-9 rounded-full border border-foreground/20 bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

type Filters = { budgetMax: string; season: Season | ""; daypart: "day" | "night" | ""; performance: "soft" | "moderate" | "strong" | ""; includeAlternatives: boolean };

export function Discover({
  defaultBudget,
  ownedCount,
  initialMode,
  defaultIncludeAlternatives = true,
  initialSeason = "",
  initialDaypart = "",
}: {
  defaultBudget: number | null;
  ownedCount: number;
  initialMode: Mode;
  defaultIncludeAlternatives?: boolean;
  initialSeason?: Season | "";
  initialDaypart?: "day" | "night" | "";
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [filters, setFilters] = useState<Filters>({ budgetMax: defaultBudget ? String(defaultBudget) : "", season: initialSeason, daypart: initialDaypart, performance: "", includeAlternatives: defaultIncludeAlternatives });
  const [res, setRes] = useState<DiscoverResponse | null>(null);
  const [pending, start] = useTransition();
  const ran = useRef(false);

  const run = (m: Mode = mode, f: Filters = filters) =>
    start(async () => {
      const budget = Number(f.budgetMax);
      setRes(
        await discoverAction({
          mode: m,
          budgetMax: f.budgetMax && budget >= 10 ? Math.min(5000, Math.round(budget)) : null,
          season: f.season || null,
          daypart: f.daypart || null,
          performance: f.performance || null,
          includeAlternatives: f.includeAlternatives,
        }),
      );
    });

  // Rank straight away: arriving from a "fill this gap" link should show the answer, not a form.
  useEffect(() => {
    if (ran.current || ownedCount === 0) return;
    ran.current = true;
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (ownedCount === 0) {
    return (
      <div className="rounded-md border border-dashed p-10 text-center">
        <p className="font-heading text-2xl">Add a few fragrances first</p>
        <p className="mt-2 text-sm text-muted-foreground">Recommendations start from what you own. One bottle is enough to begin; five gives much better results.</p>
        <Link href="/app/add" className="mt-4 inline-block font-medium text-primary hover:underline">
          Add fragrances →
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8">
      <fieldset>
        <legend className="sr-only">What are you looking for?</legend>
        <div className="grid border-y border-foreground/15 sm:grid-cols-3" role="radiogroup">
          {(Object.keys(MODE_LABEL) as Mode[]).map((m, i) => {
            const active = mode === m;
            return (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => {
                  setMode(m);
                  run(m);
                }}
                className={cn("relative px-5 py-5 text-left transition-colors focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none", i > 0 && "sm:border-l sm:border-foreground/15", active ? "bg-card" : "hover:bg-card/60")}
              >
                {active && <span className="absolute inset-x-0 top-0 h-0.5 bg-primary" aria-hidden="true" />}
                <span className={cn("font-heading text-2xl italic", active ? "text-primary" : "text-muted-foreground")}>{MODE_NUMERAL[m]}.</span>
                <span className="ml-2 font-heading text-2xl">{MODE_LABEL[m].title}</span>
                <span className="mt-1 block text-sm text-muted-foreground">{MODE_LABEL[m].blurb}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <form
        className="flex flex-wrap items-end gap-x-4 gap-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          run();
        }}
      >
        <label className="grid gap-1">
          <span className="label">Max budget (USD)</span>
          <input type="number" inputMode="numeric" min={10} max={5000} placeholder="Any" value={filters.budgetMax} onChange={(e) => setFilters({ ...filters, budgetMax: e.target.value })} className={cn(selectClass, "w-28")} aria-label="Max budget (USD)" />
        </label>
        <label className="grid gap-1">
          <span className="label">Season</span>
          <select className={selectClass} value={filters.season} onChange={(e) => setFilters({ ...filters, season: e.target.value as Filters["season"] })} aria-label="Season">
            <option value="">Any season</option>
            <option value="spring">Spring</option>
            <option value="summer">Summer</option>
            <option value="fall">Fall</option>
            <option value="winter">Winter</option>
          </select>
        </label>
        <label className="grid gap-1">
          <span className="label">Time of day</span>
          <select className={selectClass} value={filters.daypart} onChange={(e) => setFilters({ ...filters, daypart: e.target.value as Filters["daypart"] })} aria-label="Time of day">
            <option value="">Any time</option>
            <option value="day">Daytime / office</option>
            <option value="night">Evening / date</option>
          </select>
        </label>
        <label className="grid gap-1">
          <span className="label">Performance</span>
          <select className={selectClass} value={filters.performance} onChange={(e) => setFilters({ ...filters, performance: e.target.value as Filters["performance"] })} aria-label="Performance">
            <option value="">No preference</option>
            <option value="soft">Soft, close to skin</option>
            <option value="moderate">Moderate</option>
            <option value="strong">Long-lasting</option>
          </select>
        </label>
        <label className="flex h-9 items-center gap-2 text-sm" title="Fragrances the community says smell like a pricier one">
          <input type="checkbox" checked={filters.includeAlternatives} onChange={(e) => setFilters({ ...filters, includeAlternatives: e.target.checked })} className="size-4 accent-[var(--primary)]" />
          Include budget alternatives
        </label>
        <button type="submit" disabled={pending} className="ml-auto inline-flex h-10 items-center rounded-full bg-ink px-5 text-sm text-ink-foreground disabled:opacity-60">
          {pending ? "Ranking…" : "Show suggestions"}
        </button>
      </form>

      <div aria-live="polite" aria-busy={pending}>
        {pending && !res && <ResultsSkeleton />}
        {res && !res.ok && (
          <p role="alert" className="border-l-2 border-destructive pl-3 text-sm text-destructive">
            {res.error}
          </p>
        )}
        {res && res.ok && (
          <div className={cn("grid gap-6", pending && "opacity-60")}>
            {res.globalCaveats.map((c) => (
              <p key={c} className="flex items-start gap-2 border-l-2 border-warning pl-3 text-sm">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" /> {c}
              </p>
            ))}
            {res.cards.length === 0 ? (
              <EmptyResults
                restrictive={res.mostRestrictive}
                onRelax={() => {
                  const next = { ...filters };
                  if (res.mostRestrictive === "budget") next.budgetMax = "";
                  if (res.mostRestrictive === "season") next.season = "";
                  if (res.mostRestrictive === "daypart") next.daypart = "";
                  setFilters(next);
                  run(mode, next);
                }}
              />
            ) : (
              <ol className="divide-y divide-foreground/10 border-y border-foreground/15">
                {res.cards.map((c, i) => (
                  <ResultCard key={c.fragrance.id} card={c} rank={i + 1} runId={res.runId} mode={mode} />
                ))}
              </ol>
            )}
            <p className="text-xs text-muted-foreground">
              Ranked by Sillage&apos;s deterministic engine (no AI involved in ranking) from {res.considered.toLocaleString()} well-reviewed fragrances. Excluded: {res.excluded.owned} you own
              {res.excluded.dislikedNote ? `, ${res.excluded.dislikedNote} with notes you avoid` : ""}
              {res.excluded.budget ? `, ${res.excluded.budget} over budget` : ""}
              {res.excluded.tooSimilar ? `, ${res.excluded.tooSimilar} too close to your bottles` : ""}
              {res.excluded.marketing ? `, ${res.excluded.marketing} outside your marketing preference` : ""}
              {res.excluded.alternatives ? `, ${res.excluded.alternatives} budget alternatives` : ""}.{" "}
              <Link href="/how-it-works#ranking" className="underline underline-offset-2">
                How ranking works
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyResults({ restrictive, onRelax }: { restrictive: string | null; onRelax: () => void }) {
  const text = restrictive ? RELAXATION[restrictive as keyof typeof RELAXATION] : "";
  const canRelax = restrictive === "budget" || restrictive === "season" || restrictive === "daypart";
  return (
    <div className="rounded-md border border-dashed p-8 text-center">
      <p className="font-heading text-2xl">No confident matches</p>
      <p className="mt-2 text-sm text-muted-foreground">{text || "Nothing in the catalog fits all of these filters."}</p>
      {canRelax && (
        <button type="button" className="mt-4 inline-flex h-9 items-center rounded-full border border-foreground/30 px-4 text-sm hover:border-foreground" onClick={onRelax}>
          Relax that filter and retry
        </button>
      )}
      {restrictive === "dislikedNote" && (
        <Link href="/app/preferences" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
          Review disliked notes →
        </Link>
      )}
    </div>
  );
}

const COMPONENT_LABEL = { preference: "Taste fit", objective: "Mode goal", budget: "Budget", context: "Season & time", performance: "Performance" } as const;

function ResultCard({ card, rank, runId, mode }: { card: RecommendationCard; rank: number; runId: string | null; mode: Mode }) {
  const f = card.fragrance;
  const [open, setOpen] = useState(false);
  const [reaction, setReaction] = useState<"relevant" | "not_relevant" | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const react = (r: "relevant" | "not_relevant") =>
    runId &&
    start(async () => {
      const res = await feedbackAction(runId, f.id, r);
      if (res.ok) setReaction(r);
      else toast.error(res.error);
    });

  return (
    <li className="grid gap-5 py-7 sm:grid-cols-[3.5rem_5rem_1fr_auto]">
      <span className="font-heading text-5xl leading-none text-muted-foreground italic" aria-label={`Rank ${rank}`}>
        {rank}
      </span>
      <ScentSwatch name={f.name} accords={f.accords.map((name, i) => ({ name, strength: 100 - i * 22 }))} size="md" />
      <div className="min-w-0">
        <p className="label">
          {f.brand} · {f.family ? FAMILY_LABEL[f.family] : "Family unknown"}
          {f.priceBand && ` · est. ${PRICE_BAND_LABEL[f.priceBand]}`}
        </p>
        <h3 className="mt-1 text-3xl leading-tight">
          <Link href={`/app/fragrance/${f.id}`} className="hover:underline">
            {f.name}
          </Link>
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {f.accords.join(" · ")}
          {f.seasons.length > 0 && <span className="ml-2">({f.seasons.join(", ")})</span>}
        </p>
        <ul className="mt-3 grid gap-1 text-sm">
          {card.reasons.map((r) => (
            <li key={r} className="flex gap-2">
              <span aria-hidden="true" className="text-primary">
                —
              </span>
              {r}
            </li>
          ))}
          {card.caveats.map((c) => (
            <li key={c} className="flex gap-2 text-muted-foreground">
              <span aria-hidden="true">!</span>
              <span>
                <span className="sr-only">Caveat: </span>
                {c}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={saved || pending}
            onClick={() =>
              start(async () => {
                const r = await addWishlistAction(f.id);
                if (r.ok || r.error.startsWith("Already")) setSaved(true);
                else toast.error(r.error);
              })
            }
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-foreground/25 px-3 text-xs hover:border-foreground disabled:opacity-70"
          >
            <Heart className={cn("size-3.5", saved && "fill-primary text-primary")} aria-hidden="true" /> {saved ? "On wishlist" : "Save"}
          </button>
          <Link href={`/app/score?candidate=${f.id}`} className="inline-flex h-8 items-center rounded-full px-3 text-xs text-primary hover:bg-muted">
            Score impact
          </Link>
          <Link href={`/app/fragrance/${f.id}#offers-h`} className="inline-flex h-8 items-center rounded-full px-3 text-xs text-primary hover:bg-muted">
            Compare prices
          </Link>
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="inline-flex h-8 items-center gap-1 rounded-full px-3 text-xs text-muted-foreground hover:bg-muted">
            Why this rank <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} aria-hidden="true" />
          </button>
        </div>
        {open && (
          <dl className="mt-3 grid max-w-lg gap-1.5 rounded-sm bg-muted/60 p-3 text-xs">
            {(Object.keys(COMPONENT_LABEL) as (keyof typeof COMPONENT_LABEL)[]).map((k) => (
              <div key={k} className="grid grid-cols-[8rem_1fr_4rem] items-center gap-3">
                <dt>
                  {COMPONENT_LABEL[k]} <span className="text-muted-foreground">({Math.round(MODE_WEIGHTS[mode][k] * 100)}%)</span>
                </dt>
                <dd className="h-1 rounded-full bg-background" aria-hidden="true">
                  <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.round(card.components[k] * 100)}%` }} />
                </dd>
                <dd className="text-right font-mono tabular-nums">{Math.round(card.components[k] * 100)}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
      <div className="flex flex-row items-start justify-between gap-3 sm:flex-col sm:items-end">
        <div className="text-right">
          <p className="font-heading text-4xl leading-none tabular-nums">{Math.round(card.score * 100)}%</p>
          <p className="label mt-1">estimated fit</p>
          <Rating rating={f.rating} votes={f.votes} className="mt-2" />
        </div>
        {runId && (
          <span className="flex items-center gap-1" role="group" aria-label="Was this relevant?">
            <span className="mr-1 text-xs text-muted-foreground">{reaction ? "Thanks" : "Relevant?"}</span>
            <button type="button" aria-pressed={reaction === "relevant"} aria-label="Relevant" onClick={() => react("relevant")} className={cn("rounded-full p-1.5 hover:bg-muted", reaction === "relevant" && "bg-muted text-primary")}>
              <ThumbsUp className="size-4" />
            </button>
            <button type="button" aria-pressed={reaction === "not_relevant"} aria-label="Not relevant" onClick={() => react("not_relevant")} className={cn("rounded-full p-1.5 hover:bg-muted", reaction === "not_relevant" && "bg-muted text-primary")}>
              <ThumbsDown className="size-4" />
            </button>
          </span>
        )}
      </div>
    </li>
  );
}

function ResultsSkeleton() {
  return (
    <div className="grid gap-4" role="status">
      <span className="sr-only">Finding suggestions…</span>
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-36 animate-pulse rounded-md bg-muted/60" />
      ))}
    </div>
  );
}
