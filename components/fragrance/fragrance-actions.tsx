"use client";

import { useState, useTransition } from "react";
import { Check, Heart, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { addFragranceAction, addWishlistAction } from "@/app/(app)/app/actions";

export function FragranceActions({ fragranceId, owned, wishlisted }: { fragranceId: string; owned: boolean; wishlisted: boolean }) {
  const [isOwned, setOwned] = useState(owned);
  const [isWished, setWished] = useState(wishlisted);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap gap-2">
      {isOwned ? (
        <span className="inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm text-success">
          <Check className="size-4" aria-hidden="true" /> In your collection
        </span>
      ) : (
        <Button
          size="lg"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await addFragranceAction(fragranceId);
              if (r.ok) {
                setOwned(true);
                toast.success("Added to your collection");
              } else toast.error(r.error);
            })
          }
        >
          <Plus aria-hidden="true" /> I own this
        </Button>
      )}
      {!isOwned &&
        (isWished ? (
          <span className="inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm">
            <Heart className="size-4 fill-primary text-primary" aria-hidden="true" /> On your wishlist
          </span>
        ) : (
          <Button
            size="lg"
            variant="outline"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await addWishlistAction(fragranceId);
                if (r.ok) {
                  setWished(true);
                  toast.success("Saved to wishlist");
                } else toast.error(r.error);
              })
            }
          >
            <Heart aria-hidden="true" /> Save to wishlist
          </Button>
        ))}
    </div>
  );
}
