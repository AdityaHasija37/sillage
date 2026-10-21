import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { accordColor } from "@/lib/domain/accord-colors";
import { FAMILY_LABEL, type Family } from "@/lib/domain/fragrance";
import { cn } from "@/lib/utils";

export function AccordChips({ accords, max = 3, className }: { accords: string[]; max?: number; className?: string }) {
  return (
    <ul className={cn("flex flex-wrap gap-1.5", className)} aria-label="Main accords">
      {accords.slice(0, max).map((a) => (
        <li key={a} className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2 py-0.5 text-xs text-muted-foreground">
          <span aria-hidden="true" className="size-2 rounded-full" style={{ background: accordColor(a) }} />
          {a}
        </li>
      ))}
    </ul>
  );
}

export function AccordBars({ accords, max = 8 }: { accords: { name: string; strength: number }[]; max?: number }) {
  return (
    <ul className="grid gap-1.5" aria-label="Accords by strength">
      {accords.slice(0, max).map((a) => (
        <li key={a.name} className="grid grid-cols-[7rem_1fr_2.5rem] items-center gap-3 text-sm">
          <span className="truncate capitalize">{a.name}</span>
          <span className="h-2.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
            <span className="block h-full rounded-full" style={{ width: `${Math.max(4, a.strength)}%`, background: accordColor(a.name) }} />
          </span>
          <span className="text-right text-xs text-muted-foreground tabular-nums">{a.strength}</span>
        </li>
      ))}
    </ul>
  );
}

export function FamilyBadge({ family }: { family: Family | null }) {
  if (!family) return <Badge variant="outline">Family unknown</Badge>;
  return <Badge variant="secondary">{FAMILY_LABEL[family]}</Badge>;
}

export function Rating({ rating, votes, className }: { rating: number | null; votes: number; className?: string }) {
  if (!rating) return <span className={cn("text-xs text-muted-foreground", className)}>No community rating</span>;
  const fmt = votes >= 1000 ? `${(votes / 1000).toFixed(votes >= 10000 ? 0 : 1)}k` : String(votes);
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs text-muted-foreground", className)}>
      <Star className="size-3.5 fill-primary text-primary" aria-hidden="true" />
      <span className="font-medium text-foreground tabular-nums">{rating.toFixed(1)}</span>
      <span className="sr-only">out of 5,</span>
      <span>({fmt} votes)</span>
    </span>
  );
}

export function DataQuality({ quality }: { quality: "verified" | "partial" | "unverified" }) {
  const label = { verified: "Verified data", partial: "Community data", unverified: "Unverified listing" }[quality];
  const hint = {
    verified: "Checked against the brand's published information.",
    partial: "Notes and ratings come from community votes; treat them as estimates.",
    unverified: "Basic product listing only: no notes or ratings available.",
  }[quality];
  return (
    <Badge variant="outline" title={hint} className={quality === "unverified" ? "border-warning/50 text-warning" : undefined}>
      {label}
    </Badge>
  );
}
