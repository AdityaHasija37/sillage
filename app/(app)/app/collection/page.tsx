import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { ButtonLink } from "@/components/ui/button-link";
import { CollectionGrid } from "@/components/fragrance/collection-grid";
import { listCollection } from "@/lib/collection/service";

export const metadata: Metadata = { title: "My collection" };

export default async function CollectionPage() {
  const items = await listCollection();
  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-5xl sm:text-6xl">My collection</h1>
          <p className="mt-2 text-muted-foreground">Rate what you own. Love, like and dislike all shape your recommendations; unrated bottles count only a little.</p>
        </div>
        <ButtonLink href="/app/add">
          <Plus aria-hidden="true" /> Add fragrance
        </ButtonLink>
      </header>
      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="font-heading text-xl">Your collection is empty</p>
          <p className="mt-2 text-sm text-muted-foreground">Add the bottles on your shelf to see what they say about your taste.</p>
          <ButtonLink href="/app/add" className="mt-4">
            Add your first fragrance
          </ButtonLink>
        </div>
      ) : (
        <CollectionGrid
          rows={items.map((i) => ({
            id: i.id,
            fragranceId: i.fragrance.id,
            brand: i.fragrance.brand,
            name: i.fragrance.name,
            family: i.fragrance.family,
            accords: i.fragrance.accords,
            rating: i.fragrance.community?.rating ?? null,
            votes: i.fragrance.community?.votes ?? 0,
            sentiment: i.sentiment,
          }))}
        />
      )}
    </div>
  );
}
