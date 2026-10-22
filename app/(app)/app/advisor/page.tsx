import type { Metadata } from "next";
import Link from "next/link";
import { AdvisorPanel } from "@/components/advisor/advisor-panel";
import { getPreferences, listCollection } from "@/lib/collection/service";
import { buildProfile } from "@/lib/domain/profile";
import { TOOL_DEFINITIONS } from "@/lib/agent/tools";

export const metadata: Metadata = { title: "Advisor" };

const TOOL_COPY: Record<string, string> = {
  get_user_profile: "Your shelf summary and preferences",
  get_owned_fragrances: "Each bottle and how you rated it",
  search_catalog: "Find a fragrance you mention by name",
  get_fragrance_details: "Notes, accords, community votes",
  recommend_candidates: "Run Discover's ranking engine",
  find_offers: "Price one exact bottle",
  get_collection_score: "Your Collection Score and gaps",
  pick_for_today: "Rank your own bottles for today",
  propose_add_to_wishlist: "Suggest a wishlist save",
  propose_preference_update: "Suggest a preference change",
};

export default async function AdvisorPage() {
  const [owned, prefs] = await Promise.all([listCollection(), getPreferences()]);
  const profile = buildProfile(owned);
  const live = Boolean(process.env.ANTHROPIC_API_KEY);
  const reads = TOOL_DEFINITIONS.filter((t) => !t.name.startsWith("propose_"));
  const proposes = TOOL_DEFINITIONS.filter((t) => t.name.startsWith("propose_"));
  return (
    <div className="grid gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label">The advisor · {live ? "Claude agent" : "offline rule-based mode"}</p>
          <h1 className="mt-2 text-5xl sm:text-6xl">
            Ask about your <em className="text-primary">next bottle.</em>
          </h1>
        </div>
        <p className="max-w-sm text-sm text-muted-foreground">It plans, calls Sillage&apos;s own tools, and explains. It never ranks on its own, cites nothing a tool didn&apos;t return, and saves nothing without your click.</p>
      </header>
      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <section aria-label="Conversation" className="flex h-[min(44rem,calc(100dvh-16rem))] min-h-[30rem] flex-col overflow-hidden rounded-md border bg-card">
          <AdvisorPanel />
        </section>
        <aside className="grid content-start gap-6 text-sm">
          <div className="rounded-md border p-5">
            <p className="label">What it can see</p>
            <ul className="mt-3 grid gap-1.5">
              <li>
                {owned.length} bottle{owned.length === 1 ? "" : "s"}, {profile.ratedCount} rated
              </li>
              <li>Signature: {profile.topAccords.slice(0, 3).map((a) => a.name).join(", ") || "not enough data"}</li>
              <li>Avoids: {prefs.dislikedNotes.join(", ") || "nothing set"}</li>
              <li>Budget: {prefs.budgetMax ? `up to $${prefs.budgetMax}` : "none set"}</li>
            </ul>
            <Link href="/app/preferences" className="mt-3 inline-block text-xs text-primary hover:underline">
              Edit what it knows →
            </Link>
          </div>
          <div className="rounded-md border p-5">
            <p className="label">Tools it can call</p>
            <p className="mt-3 text-xs text-muted-foreground">Reads</p>
            <ul className="mt-1 grid gap-1">
              {reads.map((t) => (
                <li key={t.name}>
                  <span className="font-mono text-[11px] text-primary">{t.name}</span>
                  <span className="block text-xs text-muted-foreground">{TOOL_COPY[t.name]}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">Proposes (you confirm)</p>
            <ul className="mt-1 grid gap-1">
              {proposes.map((t) => (
                <li key={t.name}>
                  <span className="font-mono text-[11px] text-primary">{t.name}</span>
                  <span className="block text-xs text-muted-foreground">{TOOL_COPY[t.name]}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-md bg-ink p-5 text-ink-foreground">
            <p className="font-mono text-[11px] tracking-[0.08em] text-[oklch(0.8_0.1_55)] uppercase">Guardrails</p>
            <ul className="mt-3 grid gap-1.5 text-ink-foreground/80">
              <li>At most six tool steps per answer</li>
              <li>Fragrances and prices not returned by a tool are removed before you see them</li>
              <li>Review text from other sites is treated as data, never as instructions</li>
              <li>20 questions an hour; tokens and cost shown per answer</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
