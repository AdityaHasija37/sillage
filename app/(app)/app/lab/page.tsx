import type { Metadata } from "next";
import { ScentLab } from "@/components/intelligence/scent-lab";
import { getUser } from "@/lib/auth/session";
import { listCollection } from "@/lib/collection/service";
import { listExperiments } from "@/lib/intelligence/service";

export const metadata: Metadata = { title: "Scent Lab" };

export default async function LabPage() {
  const [owned, experiments, user] = await Promise.all([listCollection(), listExperiments().catch(() => []), getUser()]);
  return (
    <div className="grid gap-10">
      <header>
        <p className="label">Scent Lab{user?.isDemo ? " · sample experiments included" : ""}</p>
        <h1 className="mt-2 text-5xl sm:text-6xl">
          Two bottles, <em className="text-primary">one experiment.</em>
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">Pair two fragrances you own. Sillage predicts how they might layer and why, then you wear it and log what really happened. Over time your own results nudge future predictions.</p>
      </header>
      <ScentLab owned={owned.map((o) => ({ id: o.fragrance.id, brand: o.fragrance.brand, name: o.fragrance.name, accords: o.fragrance.accords }))} initialExperiments={experiments} />
    </div>
  );
}
