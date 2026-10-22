"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowRight, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { ScentSwatch } from "@/components/fragrance/scent-swatch";
import { addFragranceAction } from "@/app/(app)/app/actions";
import type { FragranceSummary } from "@/lib/catalog/service";
import type { ScorePreview } from "@/lib/intelligence/score";
import { cn } from "@/lib/utils";

type Preview = ScorePreview & { candidate: { id: string; brand: string; name: string } };
type Option = { id: string; brand: string; name: string; accords: string[] };

export function ScoreSimulator({ wishlist, initialCandidateId }: { wishlist: Option[]; initialCandidateId: string | null }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<FragranceSummary[]>([]);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);
  const req = useRef(0);

  const run = useCallback(async (candidateFragranceId: string) => {
    const id = ++req.current;
    setLoading(true);
    setError(null);
    setAdded(false);
    try {
      const res = await fetch("/api/intelligence/collection-score/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ candidateFragranceId }) });
      const body = await res.json();
      if (id !== req.current) return;
      if (!res.ok) throw new Error(body.message ?? "Preview unavailable");
      setPreview(body);
      setResults([]);
      setQ("");
    } catch (e) {
      if (id === req.current) setError(e instanceof Error ? e.message : "Preview unavailable");
    } finally {
      if (id === req.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial preview from a ?candidate= link
    if (initialCandidateId) run(initialCandidateId);
  }, [initialCandidateId, run]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/catalog/search?${new URLSearchParams({ q: term, live: "0" })}`);
        const body = (await res.json()) as { items?: FragranceSummary[] };
        setResults((body.items ?? []).slice(0, 6));
      } catch {
        setResults([]);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="grid gap-8">
      <div className="grid gap-4">
        <label htmlFor="sim-q" className="label">
          A bottle you&apos;re considering
        </label>
        <div className="relative max-w-xl">
          <div className="flex items-center gap-3 border-b-2 border-foreground pb-2 focus-within:border-primary">
            <Search className="size-5 text-muted-foreground" aria-hidden="true" />
            <input id="sim-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the catalog" autoComplete="off" className="w-full bg-transparent font-heading text-2xl outline-none placeholder:text-muted-foreground/70" />
            {loading && <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Calculating" />}
          </div>
          {q.trim().length >= 2 && results.length > 0 && (
            <ul className="absolute inset-x-0 top-full z-20 mt-2 divide-y overflow-hidden rounded-md border bg-card shadow-lg">
              {results.map((r) => (
                <li key={r.id}>
                  <button type="button" onClick={() => run(r.id)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-muted focus-visible:bg-muted focus-visible:outline-none">
                    <ScentSwatch name={r.name} accords={r.accords.map((name, i) => ({ name, strength: 100 - i * 25 }))} size="xs" />
                    <span className="min-w-0">
                      <span className="label mr-2">{r.brand}</span>
                      <span className="font-heading text-lg">{r.name}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {wishlist.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">From your wishlist:</span>
            {wishlist.map((w) => (
              <button key={w.id} type="button" onClick={() => run(w.id)} className="rounded-full border border-foreground/20 px-3 py-1 hover:border-foreground">
                {w.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="border-l-2 border-destructive pl-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div aria-live="polite">{preview && <PreviewResult preview={preview} added={added} onAdd={async () => {
        const r = await addFragranceAction(preview.candidate.id);
        if (r.ok) {
          setAdded(true);
          toast.success("Added to your collection");
        } else toast.error(r.error);
      }} />}</div>

      {!preview && !loading && (
        <p className="max-w-xl text-sm text-muted-foreground">Nothing is added to your collection here. It&apos;s a what-if: see how a bottle would change your coverage, then decide.</p>
      )}
    </div>
  );
}

function PreviewResult({ preview, added, onAdd }: { preview: Preview; added: boolean; onAdd: () => void }) {
  const before = preview.current.status === "ok" ? preview.current.overallScore : null;
  if (preview.status === "duplicate") {
    return (
      <section className="rounded-md border bg-card p-6">
        <p className="label">{preview.candidate.brand}</p>
        <p className="font-heading text-3xl">{preview.candidate.name}</p>
        <p className="mt-3 text-muted-foreground">{preview.message}</p>
      </section>
    );
  }
  const after = preview.hypothetical.status === "ok" ? preview.hypothetical.overallScore : null;
  return (
    <section aria-label={`Score preview for ${preview.candidate.brand} ${preview.candidate.name}`} className="grid gap-6 rounded-md border bg-card p-6 lg:grid-cols-[1fr_1.2fr]">
      <div>
        <p className="label">If you added</p>
        <p className="font-heading text-3xl">
          {preview.candidate.brand} {preview.candidate.name}
        </p>
        <div className="mt-6 flex items-end gap-5">
          <div>
            <p className="label">Now</p>
            <p className="font-heading text-6xl leading-none text-muted-foreground tabular-nums">{before ?? "–"}</p>
          </div>
          <ArrowRight className="mb-3 size-6 text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="label">With it</p>
            <p className="font-heading text-6xl leading-none tabular-nums">{after ?? "–"}</p>
          </div>
          <p className={cn("mb-2 rounded-full px-3 py-1 font-mono text-sm tabular-nums", preview.delta > 0 ? "bg-[color-mix(in_oklch,var(--success),transparent_85%)] text-success" : preview.delta < 0 ? "bg-destructive/10 text-destructive" : "bg-muted")}>
            {preview.delta > 0 ? "+" : ""}
            {preview.delta}
          </p>
        </div>
        <div className="mt-6 grid gap-2 text-sm">
          {preview.adds.length > 0 ? (
            <p>
              <span className="font-medium">Adds:</span> {preview.adds.join(", ")}.
            </p>
          ) : (
            <p className="text-muted-foreground">Doesn&apos;t noticeably extend what your shelf already covers.</p>
          )}
          {preview.overlap && (
            <p className={preview.overlap.similarity >= 0.6 ? "text-warning" : "text-muted-foreground"}>
              <span className="font-medium">Overlaps most with</span> {preview.overlap.name} ({Math.round(preview.overlap.similarity * 100)}% alike).
            </p>
          )}
          {preview.lowConfidence && (
            <p className="flex items-center gap-1.5 text-warning">
              <AlertTriangle className="size-4" aria-hidden="true" /> Sparse data for this fragrance, so treat the change as rough.
            </p>
          )}
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href={`/app/fragrance/${preview.candidate.id}`} className="inline-flex h-9 items-center rounded-full border border-foreground/25 px-4 text-sm hover:border-foreground">
            View fragrance
          </Link>
          <button type="button" disabled={added} onClick={onAdd} className="inline-flex h-9 items-center rounded-full bg-ink px-4 text-sm text-ink-foreground disabled:opacity-60">
            {added ? "Added" : "I bought it: add to collection"}
          </button>
        </div>
      </div>
      <table className="w-full self-start text-sm">
        <caption className="label mb-2 text-left">Dimension changes</caption>
        <thead className="sr-only">
          <tr>
            <th>Dimension</th>
            <th>Before</th>
            <th>After</th>
            <th>Change</th>
          </tr>
        </thead>
        <tbody>
          {preview.dimensionDeltas.map((d) => (
            <tr key={d.key} className="border-t">
              <th scope="row" className="py-2.5 pr-3 text-left font-normal">
                {d.label}
              </th>
              <td className="w-40 py-2.5" aria-label={`before ${d.before ?? "n/a"}, after ${d.after ?? "n/a"}`}>
                <span className="relative block h-1.5 rounded-full bg-muted">
                  <span className="absolute inset-y-0 left-0 rounded-full bg-foreground/25" style={{ width: `${d.before ?? 0}%` }} />
                  <span className="absolute inset-y-0 left-0 rounded-full bg-primary/70" style={{ width: `${d.after ?? 0}%`, mixBlendMode: "multiply" }} />
                </span>
              </td>
              <td className="py-2.5 pl-3 text-right font-mono tabular-nums">
                {d.before ?? "–"} → {d.after ?? "–"}
              </td>
              <td className={cn("py-2.5 pl-3 text-right font-mono tabular-nums", d.delta > 0 ? "text-success" : d.delta < 0 ? "text-destructive" : "text-muted-foreground")}>
                {d.delta > 0 ? "+" : ""}
                {d.delta}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
