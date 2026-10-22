"use client";

import Link from "next/link";
import { useTransition } from "react";
import { PackageCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { moveWishlistAction, removeWishlistAction } from "@/app/(app)/app/actions";
import { FAMILY_LABEL, PRICE_BAND_LABEL, type Family, type PriceBand } from "@/lib/domain/fragrance";
import { ScentSwatch } from "./scent-swatch";
import { AccordChips, Rating } from "./bits";

export type WishRow = { id: string; fragranceId: string; brand: string; name: string; family: Family | null; accords: { name: string; strength: number }[]; rating: number | null; votes: number; priceBand: PriceBand | null };

export function WishlistList({ rows }: { rows: WishRow[] }) {
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {rows.map((r) => (
        <Row key={r.id} r={r} />
      ))}
    </ul>
  );
}

function Row({ r }: { r: WishRow }) {
  const [pending, start] = useTransition();
  return (
    <li className="flex gap-4 rounded-md border bg-card p-4">
      <ScentSwatch name={r.name} accords={r.accords} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="text-xs tracking-wide text-muted-foreground uppercase">{r.brand}</p>
        <h3 className="font-heading text-lg">
          <Link href={`/app/fragrance/${r.fragranceId}`} className="hover:underline">
            {r.name}
          </Link>
        </h3>
        <p className="text-xs text-muted-foreground">
          {r.family ? FAMILY_LABEL[r.family] : "Family unknown"}
          {r.priceBand && ` · est. ${PRICE_BAND_LABEL[r.priceBand]}`}
        </p>
        <AccordChips accords={r.accords.map((a) => a.name)} className="mt-2" />
        <Rating rating={r.rating} votes={r.votes} className="mt-2" />
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href={`/app/fragrance/${r.fragranceId}#offers-h`} className="inline-flex h-7 items-center rounded-full bg-ink px-3 text-ink-foreground text-[0.8rem] font-medium">
            Compare prices
          </Link>
          <Link href={`/app/score?candidate=${r.fragranceId}`} className="inline-flex h-7 items-center rounded-full px-2.5 text-[0.8rem] text-primary hover:bg-muted">
            Score impact
          </Link>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await moveWishlistAction(r.id);
                if (res.ok) toast.success(`Moved ${r.name} to your collection`);
                else toast.error(res.error);
              })
            }
          >
            <PackageCheck aria-hidden="true" /> I bought it
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={`Remove ${r.brand} ${r.name} from wishlist`}
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await removeWishlistAction(r.id);
                if (!res.ok) toast.error(res.error);
              })
            }
          >
            <Trash2 />
          </Button>
        </div>
      </div>
    </li>
  );
}
