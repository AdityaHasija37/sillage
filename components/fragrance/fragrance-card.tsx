import Link from "next/link";
import { FAMILY_LABEL, type Fragrance } from "@/lib/domain/fragrance";
import { ScentSwatch } from "./scent-swatch";
import { AccordChips, Rating } from "./bits";
import { cn } from "@/lib/utils";

type CardFragrance = Pick<Fragrance, "id" | "brand" | "name" | "family"> & {
  accords: { name: string; strength: number }[];
  rating?: number | null;
  votes?: number;
};

/** Compact, linked card used in grids. The whole card is one link; actions sit outside it. */
export function FragranceCard({ fragrance: f, footer, className }: { fragrance: CardFragrance; footer?: React.ReactNode; className?: string }) {
  return (
    <article className={cn("group relative flex gap-4 rounded-xl border bg-card p-4 transition-shadow hover:shadow-md", className)}>
      <ScentSwatch accords={f.accords} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs tracking-wide text-muted-foreground uppercase">{f.brand}</p>
        <h3 className="font-heading text-lg leading-snug">
          <Link href={`/app/fragrance/${f.id}`} className="after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:after:ring-3 focus-visible:after:ring-ring/50">
            {f.name}
          </Link>
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">{f.family ? FAMILY_LABEL[f.family] : "Family unknown"}</p>
        <AccordChips accords={f.accords.map((a) => a.name)} className="mt-2" />
        {f.rating !== undefined && <Rating rating={f.rating ?? null} votes={f.votes ?? 0} className="mt-2" />}
        {footer && <div className="relative z-10 mt-3">{footer}</div>}
      </div>
    </article>
  );
}
