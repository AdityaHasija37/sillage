"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Check, Heart, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addWishlistAction } from "@/app/(app)/app/actions";
import type { FragranceSummary } from "@/lib/catalog/service";
import { FAMILY_LABEL } from "@/lib/domain/fragrance";
import { useCatalogSearch } from "./catalog-search";
import { ScentSwatch } from "./scent-swatch";
import { Rating } from "./bits";

const FIRST_RESULTS = 5;

/** For people who already know the bottle: find it in the catalog and save it, no advisor needed. */
export function WishlistSearch({ ownedIds, savedIds }: { ownedIds: string[]; savedIds: string[] }) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const { shown, loading, error } = useCatalogSearch(q, page);
  const owned = new Set(ownedIds);
  const saved = new Set(savedIds);
  const items = shown?.items ?? [];
  const visible = expanded ? items : items.slice(0, FIRST_RESULTS);
  const canShowMore = !expanded ? items.length > FIRST_RESULTS || shown?.hasMore : shown?.hasMore;

  return (
    <section id="search" aria-labelledby="wishlist-search-title" className="grid scroll-mt-24 gap-3 rounded-md border bg-card p-4 sm:p-5">
      <div>
        <h2 id="wishlist-search-title" className="text-xl">
          Know what you want?
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">Search about 38,000 fragrances and save one straight to your wishlist. Typos are fine.</p>
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <label htmlFor="wishlist-q" className="sr-only">
          Search fragrances to save
        </label>
        <Input
          id="wishlist-q"
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(0);
            setExpanded(false);
          }}
          placeholder="Brand or name, e.g. Bleu de Chanel"
          className="h-11 pl-10"
          autoComplete="off"
        />
        {loading && <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" aria-label="Searching" />}
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {shown && items.length === 0 && !loading && <p className="text-sm text-muted-foreground">No matches for “{q.trim()}”. Try the brand name alone.</p>}
      {visible.length > 0 && (
        <ul className="grid divide-y rounded-md border" aria-label="Search results">
          {visible.map((f) => (
            <Row key={f.id} f={f} owned={owned.has(f.id)} saved={saved.has(f.id)} />
          ))}
        </ul>
      )}
      {canShowMore && (
        <Button
          variant="outline"
          size="sm"
          className="justify-self-start"
          disabled={loading}
          onClick={() => {
            if (!expanded) setExpanded(true);
            if (expanded || items.length <= FIRST_RESULTS) setPage((p) => p + 1);
          }}
        >
          Show more results
        </Button>
      )}
    </section>
  );
}

function Row({ f, owned, saved }: { f: FragranceSummary; owned: boolean; saved: boolean }) {
  const [pending, start] = useTransition();
  const [justSaved, setJustSaved] = useState(false);
  const isSaved = saved || justSaved;
  return (
    <li className="flex items-center gap-3 px-3 py-2.5">
      <ScentSwatch name={f.name} accords={f.accords.map((name, i) => ({ name, strength: 100 - i * 25 }))} size="xs" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">
          <Link href={`/app/fragrance/${f.id}`} className="font-medium hover:underline">
            {f.brand} {f.name}
          </Link>
          {f.year && <span className="text-muted-foreground"> · {f.year}</span>}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
          <span>{f.family ? FAMILY_LABEL[f.family] : "Family unknown"}</span>
          {f.accords.length > 0 && <span className="hidden truncate sm:inline">{f.accords.join(", ")}</span>}
          {f.votes > 0 && <Rating rating={f.rating} votes={f.votes} />}
        </div>
      </div>
      {owned ? (
        <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
          <Check className="size-4" aria-hidden="true" /> Owned
        </span>
      ) : isSaved ? (
        <span className="inline-flex items-center gap-1 text-sm text-success">
          <Check className="size-4" aria-hidden="true" /> Saved
        </span>
      ) : (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          aria-label={`Save ${f.brand} ${f.name} to wishlist`}
          onClick={() =>
            start(async () => {
              const r = await addWishlistAction(f.id);
              if (r.ok || r.error === "Already on your wishlist") {
                setJustSaved(true);
                if (r.ok) toast.success(`Saved ${f.name} to your wishlist`);
              } else toast.error(r.error);
            })
          }
        >
          {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Heart aria-hidden="true" />}
          Save
        </Button>
      )}
    </li>
  );
}
