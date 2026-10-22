import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button-link";
import { WishlistList } from "@/components/fragrance/wishlist-list";
import { listWishlist } from "@/lib/collection/service";

export const metadata: Metadata = { title: "Wishlist" };

export default async function WishlistPage() {
  const items = await listWishlist();
  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-5xl sm:text-6xl">Wishlist</h1>
        <p className="mt-2 text-muted-foreground">Fragrances you&apos;re considering. Compare prices for the exact bottle, or move one to your collection when you buy it.</p>
      </header>
      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="font-heading text-xl">Nothing saved yet</p>
          <p className="mt-2 text-sm text-muted-foreground">Save suggestions from Discover or the advisor to compare them later.</p>
          <ButtonLink href="/app/discover" className="mt-4">
            Find something to try
          </ButtonLink>
        </div>
      ) : (
        <WishlistList
          rows={items.map((i) => ({
            id: i.id,
            fragranceId: i.fragrance.id,
            brand: i.fragrance.brand,
            name: i.fragrance.name,
            family: i.fragrance.family,
            accords: i.fragrance.accords,
            rating: i.fragrance.community?.rating ?? null,
            votes: i.fragrance.community?.votes ?? 0,
            priceBand: i.fragrance.priceBand,
          }))}
        />
      )}
    </div>
  );
}
