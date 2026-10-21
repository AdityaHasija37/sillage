"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { LayoutGrid, List, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { removeItemAction, updateItemAction } from "@/app/(app)/app/actions";
import { FAMILIES, FAMILY_LABEL, type Family } from "@/lib/domain/fragrance";
import type { Sentiment } from "@/lib/domain/profile";
import { cn } from "@/lib/utils";
import { ScentSwatch } from "./scent-swatch";
import { AccordChips, Rating } from "./bits";

export type CollectionRow = {
  id: string;
  fragranceId: string;
  brand: string;
  name: string;
  family: Family | null;
  accords: { name: string; strength: number }[];
  rating: number | null;
  votes: number;
  sentiment: Sentiment | null;
};

const SENTIMENTS: { value: Sentiment; label: string }[] = [
  { value: "love", label: "Love" },
  { value: "like", label: "Like" },
  { value: "neutral", label: "Neutral" },
  { value: "dislike", label: "Dislike" },
];

export function CollectionGrid({ rows }: { rows: CollectionRow[] }) {
  const [q, setQ] = useState("");
  const [family, setFamily] = useState<Family | "all">("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const filtered = useMemo(
    () => rows.filter((r) => (family === "all" || r.family === family) && `${r.brand} ${r.name}`.toLowerCase().includes(q.trim().toLowerCase())),
    [rows, q, family],
  );
  const present = FAMILIES.filter((f) => rows.some((r) => r.family === f));

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="col-filter" className="sr-only">
          Filter your collection
        </label>
        <Input id="col-filter" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by name or brand" className="h-9 max-w-xs" />
        <div role="group" aria-label="Filter by family" className="flex flex-wrap gap-1">
          {(["all", ...present] as const).map((f) => (
            <Button key={f} size="sm" variant={family === f ? "default" : "outline"} aria-pressed={family === f} onClick={() => setFamily(f)}>
              {f === "all" ? "All" : FAMILY_LABEL[f]}
            </Button>
          ))}
        </div>
        <div role="group" aria-label="Layout" className="ml-auto flex gap-1">
          <Button size="icon-sm" variant={view === "grid" ? "secondary" : "ghost"} aria-pressed={view === "grid"} aria-label="Grid view" onClick={() => setView("grid")}>
            <LayoutGrid />
          </Button>
          <Button size="icon-sm" variant={view === "list" ? "secondary" : "ghost"} aria-pressed={view === "list"} aria-label="List view" onClick={() => setView("list")}>
            <List />
          </Button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground" role="status">
        Showing {filtered.length} of {rows.length}
      </p>
      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Nothing matches that filter.</p>
      ) : (
        <ul className={cn(view === "grid" ? "grid gap-3 sm:grid-cols-2 xl:grid-cols-3" : "grid gap-2")}>
          {filtered.map((r) => (
            <Item key={r.id} row={r} compact={view === "list"} />
          ))}
        </ul>
      )}
    </div>
  );
}

function Item({ row: r, compact }: { row: CollectionRow; compact: boolean }) {
  const [sentiment, setSentiment] = useState(r.sentiment);
  const [pending, start] = useTransition();
  const save = (s: Sentiment | null) =>
    start(async () => {
      const prev = sentiment;
      setSentiment(s);
      const res = await updateItemAction({ id: r.id, sentiment: s });
      if (!res.ok) {
        setSentiment(prev);
        toast.error(res.error);
      }
    });
  const remove = () =>
    start(async () => {
      const res = await removeItemAction(r.id);
      if (res.ok) toast.success(`Removed ${r.name}`);
      else toast.error(res.error);
    });

  return (
    <li className={cn("rounded-xl border bg-card p-4", compact && "py-3")}>
      <div className="flex gap-4">
        {!compact && <ScentSwatch accords={r.accords} size="sm" />}
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs tracking-wide text-muted-foreground uppercase">{r.brand}</p>
          <h3 className={cn("font-heading leading-snug", compact ? "text-base" : "text-lg")}>
            <Link href={`/app/fragrance/${r.fragranceId}`} className="hover:underline">
              {r.name}
            </Link>
          </h3>
          {!compact && (
            <>
              <p className="mt-0.5 text-xs text-muted-foreground">{r.family ? FAMILY_LABEL[r.family] : "Family unknown"}</p>
              <AccordChips accords={r.accords.map((a) => a.name)} className="mt-2" />
              <Rating rating={r.rating} votes={r.votes} className="mt-2" />
            </>
          )}
        </div>
        <Button size="icon-sm" variant="ghost" aria-label={`Remove ${r.brand} ${r.name} from collection`} onClick={remove} disabled={pending}>
          <Trash2 />
        </Button>
      </div>
      <fieldset className="mt-3 flex flex-wrap items-center gap-1.5 border-t pt-3">
        <legend className="sr-only">How do you feel about {r.name}?</legend>
        <span className="mr-1 text-xs text-muted-foreground">{sentiment ? "Your take:" : "Not rated:"}</span>
        {SENTIMENTS.map((s) => (
          <Button key={s.value} size="xs" variant={sentiment === s.value ? "default" : "outline"} aria-pressed={sentiment === s.value} disabled={pending} onClick={() => save(sentiment === s.value ? null : s.value)}>
            {s.label}
          </Button>
        ))}
      </fieldset>
    </li>
  );
}
