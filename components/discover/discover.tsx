"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { AlertTriangle, ArrowRight, ChevronDown, Compass, Heart, Layers, Loader2, Sparkles, ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addWishlistAction, discoverAction, feedbackAction, type DiscoverResponse, type RecommendationCard } from "@/app/(app)/app/actions";
import { FAMILY_LABEL, PRICE_BAND_LABEL, type Season } from "@/lib/domain/fragrance";
import { MODE_WEIGHTS, type Mode } from "@/lib/recommendation/engine";
import { MODE_LABEL, RELAXATION } from "@/lib/recommendation/explain";
import { cn } from "@/lib/utils";
import { ScentSwatch } from "@/components/fragrance/scent-swatch";
import { AccordChips, Rating } from "@/components/fragrance/bits";

const MODE_ICON = { similar: Layers, different: Compass, gaps: Sparkles } as const;
const selectClass = "h-9 rounded-lg border bg-background px-2.5 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";

type Filters = { budgetMax: string; season: Season | ""; daypart: "day" | "night" | ""; performance: "soft" | "moderate" | "strong" | "" };

export function Discover({ defaultBudget, ownedCount, initialMode }: { defaultBudget: number | null; ownedCount: number; initialMode: Mode }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [filters, setFilters] = useState<Filters>({ budgetMax: defaultBudget ? String(defaultBudget) : "", season: "", daypart: "", performance: "" });
  const [res, setRes] = useState<DiscoverResponse | null>(null);
  const [pending, start] = useTransition();

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
        }),
      );
    });

  if (ownedCount === 0) {
    return (
      <div className="rounded-2xl border border-dashed p-10 text-center">
        <p className="font-heading text-xl">Add a few fragrances first</p>
        <p className="mt-2 text-sm text-muted-foreground">Recommendations start from what you own. Add at least one bottle; five gives much better results.</p>
        <Link href="/app/add" className="mt-4 inline-block font-medium text-primary hover:underline">
          Add fragrances →
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <fieldset>
        <legend className="mb-3 text-sm font-medium">What are you looking for?</legend>
        <div className="grid gap-3 sm:grid-cols-3" role="radiogroup">
          {(Object.keys(MODE_LABEL) as Mode[]).map((m) => {
            const Icon = MODE_ICON[m];
            const active = mode === m;
            return (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => {
                  setMode(m);
                  if (res) run(m);
                }}
                className={cn(
                  "rounded-xl border p-4 text-left transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                  active ? "border-primary bg-accent" : "bg-card hover:bg-muted",
                )}
              >
                <Icon className={cn("size-5", active ? "text-primary" : "text-muted-foreground")} aria-hidden="true" />
                <p className="mt-2 font-heading text-lg">{MODE_LABEL[m].title}</p>
                <p className="text-sm text-muted-foreground">{MODE_LABEL[m].blurb}</p>
              </button>
            );
          })}
        </div>
      </fieldset>

      <form
        className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4"
        onSubmit={(e) => {
          e.preventDefault();
          run();
        }}
      >
        <div className="grid gap-1.5">
          <Label htmlFor="budget">Max budget (USD)</Label>
          <Input id="budget" type="number" inputMode="numeric" min={10} max={5000} placeholder="Any" value={filters.budgetMax} onChange={(e) => setFilters({ ...filters, budgetMax: e.target.value })} className="h-9 w-28" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="season">Season</Label>
          <select id="season" className={selectClass} value={filters.season} onChange={(e) => setFilters({ ...filters, season: e.target.value as Filters["season"] })}>
            <option value="">Any season</option>
            <option value="spring">Spring</option>
            <option value="summer">Summer</option>
            <option value="fall">Fall</option>
            <option value="winter">Winter</option>
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="daypart">Time of day</Label>
          <select id="daypart" className={selectClass} value={filters.daypart} onChange={(e) => setFilters({ ...filters, daypart: e.target.value as Filters["daypart"] })}>
            <option value="">Any time</option>
            <option value="day">Daytime / office</option>
            <option value="night">Evening / date</option>
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="perf">Performance</Label>
          <select id="perf" className={selectClass} value={filters.performance} onChange={(e) => setFilters({ ...filters, performance: e.target.value as Filters["performance"] })}>
            <option value="">No preference</option>
            <option value="soft">Soft, close to skin</option>
            <option value="moderate">Moderate</option>
            <option value="strong">Long-lasting</option>
          </select>
        </div>
        <Button type="submit" size="lg" disabled={pending} className="ml-auto">
          {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <ArrowRight aria-hidden="true" />}
          {res ? "Update suggestions" : "Show suggestions"}
        </Button>
      </form>

      <div aria-live="polite" aria-busy={pending}>
        {pending && !res && <ResultsSkeleton />}
        {res && !res.ok && (
          <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {res.error}
          </p>
        )}
        {res && res.ok && (
          <div className={cn("grid gap-4", pending && "opacity-60")}>
            {res.globalCaveats.map((c) => (
              <p key={c} className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/5 px-3 py-2 text-sm">
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
              <ol className="grid gap-4">
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
              {res.excluded.marketing ? `, ${res.excluded.marketing} outside your marketing preference` : ""}.{" "}
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
    <div className="rounded-2xl border border-dashed p-8 text-center">
      <p className="font-heading text-xl">No confident matches</p>
      <p className="mt-2 text-sm text-muted-foreground">{text || "Nothing in the catalog fits all of these filters."}</p>
      {canRelax && (
        <Button variant="outline" className="mt-4" onClick={onRelax}>
          Relax that filter and retry
        </Button>
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
    <li className="rounded-2xl border bg-card p-5">
      <div className="flex flex-wrap gap-5">
        <div className="flex items-start gap-3">
          <span className="font-heading text-2xl text-muted-foreground tabular-nums" aria-label={`Rank ${rank}`}>
            {rank}
          </span>
          <ScentSwatch accords={f.accords.map((name, i) => ({ name, strength: 100 - i * 22 }))} size="md" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs tracking-wide text-muted-foreground uppercase">{f.brand}</p>
              <h3 className="font-heading text-xl">
                <Link href={`/app/fragrance/${f.id}`} className="hover:underline">
                  {f.name}
                </Link>
              </h3>
              <p className="text-xs text-muted-foreground">
                {f.family ? FAMILY_LABEL[f.family] : "Family unknown"}
                {f.priceBand && ` · est. ${PRICE_BAND_LABEL[f.priceBand]}`}
                {f.seasons.length > 0 && ` · ${f.seasons.join(", ")}`}
              </p>
            </div>
            <div className="text-right">
              <p className="font-heading text-2xl tabular-nums">{Math.round(card.score * 100)}%</p>
              <p className="text-xs text-muted-foreground">estimated fit</p>
            </div>
          </div>
          <AccordChips accords={f.accords} className="mt-2" />
          <ul className="mt-3 grid gap-1 text-sm">
            {card.reasons.map((r) => (
              <li key={r} className="flex gap-2">
                <span aria-hidden="true" className="text-primary">
                  ✓
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
          <Rating rating={f.rating} votes={f.votes} className="mt-3" />

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={saved || pending}
              onClick={() =>
                start(async () => {
                  const r = await addWishlistAction(f.id);
                  if (r.ok || r.error.startsWith("Already")) setSaved(true);
                  else toast.error(r.error);
                })
              }
            >
              <Heart className={cn(saved && "fill-primary text-primary")} aria-hidden="true" /> {saved ? "On wishlist" : "Save"}
            </Button>
            <Link href={`/app/fragrance/${f.id}#offers-h`} className="inline-flex h-7 items-center rounded-lg px-2.5 text-[0.8rem] font-medium text-primary hover:bg-muted">
              Compare prices
            </Link>
            <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="inline-flex h-7 items-center gap-1 rounded-lg px-2.5 text-[0.8rem] text-muted-foreground hover:bg-muted">
              Why this rank <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} aria-hidden="true" />
            </button>
            {runId && (
              <span className="ml-auto flex items-center gap-1" role="group" aria-label="Was this relevant?">
                <span className="mr-1 text-xs text-muted-foreground">{reaction ? "Thanks" : "Relevant?"}</span>
                <Button size="icon-sm" variant={reaction === "relevant" ? "secondary" : "ghost"} aria-pressed={reaction === "relevant"} aria-label="Relevant" onClick={() => react("relevant")}>
                  <ThumbsUp />
                </Button>
                <Button size="icon-sm" variant={reaction === "not_relevant" ? "secondary" : "ghost"} aria-pressed={reaction === "not_relevant"} aria-label="Not relevant" onClick={() => react("not_relevant")}>
                  <ThumbsDown />
                </Button>
              </span>
            )}
          </div>
          {open && (
            <dl className="mt-3 grid gap-1.5 rounded-lg bg-muted/50 p-3 text-xs">
              {(Object.keys(COMPONENT_LABEL) as (keyof typeof COMPONENT_LABEL)[]).map((k) => (
                <div key={k} className="grid grid-cols-[8rem_1fr_6rem] items-center gap-3">
                  <dt>
                    {COMPONENT_LABEL[k]} <span className="text-muted-foreground">({Math.round(MODE_WEIGHTS[mode][k] * 100)}%)</span>
                  </dt>
                  <dd className="h-1.5 rounded-full bg-background" aria-hidden="true">
                    <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.round(card.components[k] * 100)}%` }} />
                  </dd>
                  <dd className="text-right tabular-nums">{Math.round(card.components[k] * 100)} / 100</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
    </li>
  );
}

function ResultsSkeleton() {
  return (
    <div className="grid gap-4" role="status">
      <span className="sr-only">Finding suggestions…</span>
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-40 animate-pulse rounded-2xl border bg-muted/50" />
      ))}
    </div>
  );
}
