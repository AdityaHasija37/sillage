import type { Metadata } from "next";
import { z } from "zod";
import { ScorePanel } from "@/components/intelligence/score-panel";
import { ScoreSimulator } from "@/components/intelligence/score-simulator";
import { getUser } from "@/lib/auth/session";
import { listWishlist } from "@/lib/collection/service";
import { getCollectionScore } from "@/lib/intelligence/service";

export const metadata: Metadata = { title: "Collection score" };

export default async function ScorePage({ searchParams }: PageProps<"/app/score">) {
  const [user, params, wishlist] = await Promise.all([getUser(), searchParams, listWishlist()]);
  const score = await getCollectionScore(user?.isDemo ?? false);
  const candidate = z.string().uuid().safeParse(params.candidate).success ? String(params.candidate) : null;
  return (
    <div className="grid gap-12">
      <header>
        <p className="label">Collection intelligence</p>
        <h1 className="mt-2 text-5xl sm:text-6xl">
          What would a new bottle <em className="text-primary">change?</em>
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">Preview any fragrance against your shelf before you buy it. You&apos;ll see whether it fills a gap or just repeats something you already own.</p>
      </header>
      <ScoreSimulator wishlist={wishlist.map((w) => ({ id: w.fragrance.id, brand: w.fragrance.brand, name: w.fragrance.name, accords: w.fragrance.accords.map((a) => a.name) }))} initialCandidateId={candidate} />
      <ScorePanel score={score} />
    </div>
  );
}
