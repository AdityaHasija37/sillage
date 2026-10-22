"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { Check, Heart, Loader2, Plus, Search, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addFragranceAction, addWishlistAction, setSentimentByFragranceAction } from "@/app/(app)/app/actions";
import type { CatalogSearchResult, FragranceSummary } from "@/lib/catalog/service";
import { FAMILY_LABEL } from "@/lib/domain/fragrance";
import type { Sentiment } from "@/lib/domain/profile";
import { ScentSwatch } from "./scent-swatch";
import { DataQuality, Rating } from "./bits";

const SENTIMENT_LABEL: Record<Sentiment, string> = { love: "Love it", like: "Like it", neutral: "It's fine", dislike: "Not for me" };

export function CatalogSearch({ ownedIds, initialCount }: { ownedIds: string[]; initialCount: number }) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<CatalogSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [owned, setOwned] = useState(new Set(ownedIds));
  const [count, setCount] = useState(initialCount);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const reqId = useRef(0);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const id = ++reqId.current;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/catalog/search?${new URLSearchParams({ q: term, page: String(page) })}`);
        const body = (await res.json()) as CatalogSearchResult & { error?: string };
        if (id !== reqId.current) return;
        if (!res.ok) throw new Error(body.error ?? "Search failed");
        setResult((prev) => (page > 0 && prev ? { ...body, items: [...prev.items, ...body.items] } : body));
        setError(null);
      } catch (e) {
        if (id === reqId.current) setError(e instanceof Error ? e.message : "Search failed");
      } finally {
        if (id === reqId.current) setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q, page]);

  // Results for a cleared or too-short query are hidden rather than reset inside the effect.
  const active = q.trim().length >= 2;
  const shown = active ? result : null;
  const failed = shown?.sources.filter((s) => s.status === "error") ?? [];
  const toFive = Math.max(0, 5 - count);

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-card px-4 py-3" role="status">
        <p className="text-sm">
          <span className="font-heading text-2xl tabular-nums">{count}</span> <span className="text-muted-foreground">in your collection</span>
        </p>
        <div className="flex min-w-48 flex-1 items-center gap-3 sm:max-w-xs">
          <div className="h-2 flex-1 rounded-full bg-muted" aria-hidden="true">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, (count / 5) * 100)}%` }} />
          </div>
          <span className="text-xs text-muted-foreground">{toFive > 0 ? `${toFive} more for a solid profile` : "Profile ready"}</span>
        </div>
        {count >= 1 && (
          <Link href="/app" className="text-sm font-medium text-primary hover:underline">
            Go to dashboard →
          </Link>
        )}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <label htmlFor="catalog-q" className="sr-only">
          Search by brand or name
        </label>
        <Input
          id="catalog-q"
          autoFocus
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(0);
          }}
          placeholder="Search by brand or name, e.g. Terre d'Hermès"
          className="h-12 pl-10 text-base"
          autoComplete="off"
          aria-describedby="catalog-hint"
        />
        {loading && <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" aria-label="Searching" />}
      </div>
      <p id="catalog-hint" className="-mt-3 text-xs text-muted-foreground">
        Typos are fine. Searches about 38,000 fragrances, plus Open Beauty Facts when nothing matches.
      </p>

      {active && error && (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      {failed.length > 0 && (
        <p className="flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/5 px-3 py-2 text-sm">
          <WifiOff className="size-4 text-warning" aria-hidden="true" /> {failed.map((s) => s.label).join(", ")} didn&apos;t respond. Showing results from the sources that did.
        </p>
      )}

      {shown && shown.items.length === 0 && !loading && (
        <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          No matches for “{q.trim()}”. Try the brand name alone, or a shorter spelling.
        </div>
      )}

      {shown && shown.items.length > 0 && (
        <ul className="grid gap-2" aria-label="Search results">
          {shown.items.map((f) => (
            <ResultRow
              key={f.id}
              f={f}
              owned={owned.has(f.id)}
              justAdded={justAdded === f.id}
              onAdded={() => {
                setOwned((s) => new Set(s).add(f.id));
                setCount((c) => c + 1);
                setJustAdded(f.id);
              }}
            />
          ))}
        </ul>
      )}
      {shown?.hasMore && (
        <Button variant="outline" onClick={() => setPage((p) => p + 1)} disabled={loading} className="justify-self-center">
          Show more results
        </Button>
      )}
    </div>
  );
}

function ResultRow({ f, owned, justAdded, onAdded }: { f: FragranceSummary; owned: boolean; justAdded: boolean; onAdded: () => void }) {
  const [pending, start] = useTransition();
  const [sentiment, setSentiment] = useState<Sentiment | null>(null);
  return (
    <li className="rounded-md border bg-card p-3">
      <div className="flex items-center gap-3">
        <ScentSwatch name={f.name} accords={f.accords.map((name, i) => ({ name, strength: 100 - i * 25 }))} size="xs" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm">
            <Link href={`/app/fragrance/${f.id}`} className="font-medium hover:underline">
              {f.brand} {f.name}
            </Link>
            {f.year && <span className="text-muted-foreground"> · {f.year}</span>}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{f.family ? FAMILY_LABEL[f.family] : "Family unknown"}</span>
            {f.accords.length > 0 && <span className="truncate">{f.accords.join(", ")}</span>}
            {f.votes > 0 && <Rating rating={f.rating} votes={f.votes} />}
            {f.dataQuality === "unverified" && <DataQuality quality="unverified" />}
          </div>
        </div>
        {owned ? (
          <span className="inline-flex items-center gap-1 text-sm text-success">
            <Check className="size-4" aria-hidden="true" /> Owned
          </span>
        ) : (
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant="ghost"
              aria-label={`Add ${f.brand} ${f.name} to wishlist`}
              onClick={() =>
                start(async () => {
                  const r = await addWishlistAction(f.id);
                  if (r.ok) toast.success("Saved to wishlist");
                  else toast.error(r.error);
                })
              }
            >
              <Heart aria-hidden="true" />
            </Button>
            <Button
              size="sm"
              disabled={pending}
              aria-label={`Add ${f.brand} ${f.name} to my collection`}
              onClick={() =>
                start(async () => {
                  const r = await addFragranceAction(f.id);
                  if (r.ok) onAdded();
                  else toast.error(r.error);
                })
              }
            >
              <Plus aria-hidden="true" /> I own this
            </Button>
          </div>
        )}
      </div>
      {justAdded && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3 text-sm">
          <span className="text-muted-foreground">Added. How do you feel about it?</span>
          {(Object.keys(SENTIMENT_LABEL) as Sentiment[]).map((s) => (
            <SentimentButton key={s} fragranceId={f.id} sentiment={s} selected={sentiment === s} onSaved={() => setSentiment(s)} />
          ))}
          <span className="text-xs text-muted-foreground">Optional. Owning a bottle doesn&apos;t mean you like it.</span>
        </div>
      )}
    </li>
  );
}

function SentimentButton({ fragranceId, sentiment, selected, onSaved }: { fragranceId: string; sentiment: Sentiment; selected: boolean; onSaved: () => void }) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="xs"
      variant={selected ? "default" : "outline"}
      aria-pressed={selected}
      disabled={pending}
      onClick={() =>
        start(async () => {
          // The collection item id isn't known client-side yet; the action resolves it by fragrance.
          const r = await setSentimentByFragranceAction(fragranceId, sentiment);
          if (r.ok) onSaved();
          else toast.error(r.error);
        })
      }
    >
      {SENTIMENT_LABEL[sentiment]}
    </Button>
  );
}
