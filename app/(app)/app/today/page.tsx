import type { Metadata } from "next";
import { DailySelector } from "@/components/intelligence/daily-selector";
import { listCollection } from "@/lib/collection/service";

export const metadata: Metadata = { title: "Today" };

export default async function TodayPage() {
  const owned = await listCollection();
  const now = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date());
  return (
    <div className="grid gap-10">
      <header>
        <p className="label">{now}</p>
        <h1 className="mt-2 text-5xl sm:text-6xl">
          What should I wear <em className="text-primary">today?</em>
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">Tell it about your day. It ranks the bottles you already own: never something you&apos;d have to buy.</p>
      </header>
      <DailySelector owned={owned.map((o) => ({ id: o.fragrance.id, brand: o.fragrance.brand, name: o.fragrance.name, accords: o.fragrance.accords }))} />
    </div>
  );
}
