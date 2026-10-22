"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { ScentSwatch } from "@/components/fragrance/scent-swatch";
import type { FragranceSummary } from "@/lib/catalog/service";
import { FAMILY_LABEL } from "@/lib/domain/fragrance";

const EXAMPLES = ["Sauvage", "Baccarat Rouge", "Santal 33", "Khamrah", "Light Blue"];

/** The landing page's first interaction: search the real catalog before signing up for anything. */
export function HeroSearch() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<FragranceSummary[] | null>(null);
  const [loading, setLoading] = useState(false);
  const req = useRef(0);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const id = ++req.current;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/catalog/search?${new URLSearchParams({ q: term, live: "0" })}`);
        const body = (await res.json()) as { items?: FragranceSummary[] };
        if (id === req.current) setItems((body.items ?? []).slice(0, 5));
      } catch {
        if (id === req.current) setItems([]);
      } finally {
        if (id === req.current) setLoading(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  const shown = q.trim().length >= 2 ? items : null;

  return (
    <div className="relative max-w-xl">
      <label htmlFor="hero-q" className="label mb-2 block">
        Start with one bottle you own
      </label>
      <div className="flex items-center gap-3 border-b-2 border-foreground pb-2 focus-within:border-primary">
        <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          id="hero-q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search 38,000 fragrances"
          autoComplete="off"
          className="w-full bg-transparent font-heading text-2xl outline-none placeholder:text-muted-foreground/70 sm:text-3xl"
        />
        {loading && <span className="label animate-pulse">searching</span>}
      </div>
      {!shown && (
        <p className="mt-3 flex flex-wrap items-center gap-x-1 gap-y-1 text-sm text-muted-foreground">
          Try
          {EXAMPLES.map((e, i) => (
            <span key={e}>
              <button type="button" onClick={() => setQ(e)} className="underline decoration-border underline-offset-4 hover:text-foreground hover:decoration-primary">
                {e}
              </button>
              {i < EXAMPLES.length - 1 ? "," : ""}
            </span>
          ))}
        </p>
      )}
      {shown && (
        <ul className="absolute inset-x-0 top-full z-20 mt-2 divide-y overflow-hidden rounded-md border bg-card shadow-[0_18px_40px_-20px_oklch(0.2_0.02_50/0.35)]" aria-label="Catalog matches">
          {shown.length === 0 && !loading && <li className="px-4 py-3 text-sm text-muted-foreground">No match. Try the brand name alone.</li>}
          {shown.map((f) => (
            <li key={f.id} className="flex items-center gap-3 px-4 py-2.5">
              <ScentSwatch name={f.name} accords={f.accords.map((name, i) => ({ name, strength: 100 - i * 25 }))} size="xs" />
              <div className="min-w-0 flex-1">
                <p className="truncate">
                  <span className="label mr-2">{f.brand}</span>
                  <span className="font-heading text-lg">{f.name}</span>
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {f.family ? FAMILY_LABEL[f.family] : "Family unknown"}
                  {f.accords.length > 0 && ` · ${f.accords.join(", ")}`}
                </p>
              </div>
              {f.rating && <span className="font-mono text-xs text-muted-foreground tabular-nums">★ {f.rating.toFixed(1)}</span>}
            </li>
          ))}
          {shown.length > 0 && <li className="bg-muted/60 px-4 py-2 text-xs text-muted-foreground">Real community data. Add bottles like these to your own shelf in the demo.</li>}
        </ul>
      )}
    </div>
  );
}
