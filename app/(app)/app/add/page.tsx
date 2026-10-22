import type { Metadata } from "next";
import { CatalogSearch } from "@/components/fragrance/catalog-search";
import { listCollection } from "@/lib/collection/service";

export const metadata: Metadata = { title: "Add fragrances" };

export default async function AddPage() {
  const owned = await listCollection();
  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <header>
        <h1 className="text-5xl sm:text-6xl">Add what you own</h1>
        <p className="mt-2 text-muted-foreground">Search, then add each bottle. You can rate them now or later.</p>
      </header>
      <CatalogSearch ownedIds={owned.map((o) => o.fragrance.id)} initialCount={owned.length} />
    </div>
  );
}
