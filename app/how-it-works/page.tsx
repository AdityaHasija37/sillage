import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader, GITHUB_URL } from "@/components/marketing/site-header";
import { MODE_WEIGHTS } from "@/lib/recommendation/engine";
import { RATE_LIMITS } from "@/lib/security/rate";
import { OFFER_TTL_HOURS } from "@/lib/offers/service";

export const metadata: Metadata = { title: "How it works", description: "Where Sillage's data comes from, how recommendations are ranked, how the AI advisor is kept grounded, and how prices are matched." };

const TOOLS = [
  ["get_user_profile", "Collection size, family mix, season and day/night coverage, preferences"],
  ["get_owned_fragrances", "What you own, with your ratings (ownership alone isn't treated as liking)"],
  ["search_catalog", "Find a fragrance you mention by name"],
  ["get_fragrance_details", "Notes, accords, community votes, review themes (marked untrusted)"],
  ["recommend_candidates", "Runs the same deterministic engine as Discover"],
  ["find_offers", "Variant-matched price comparison, live or clearly labelled sample"],
  ["propose_add_to_wishlist", "Shows you a confirm button; saves nothing by itself"],
  ["propose_preference_update", "Same: a proposal you confirm or dismiss"],
];

export default function HowItWorks() {
  const w = MODE_WEIGHTS;
  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main className="mx-auto grid max-w-4xl gap-16 px-4 pt-6 pb-24 sm:px-6 [&_h2]:text-3xl [&_h2]:font-medium [&_h2]:tracking-tight [&_p]:leading-relaxed">
        <header>
          <p className="text-sm font-medium tracking-wide text-primary uppercase">How it works</p>
          <h1 className="mt-3 text-5xl font-medium tracking-tight">The system behind the suggestions</h1>
          <p className="mt-4 text-lg text-muted-foreground">Plain-language notes on data, ranking, the AI advisor and prices, including what Sillage deliberately doesn&apos;t do.</p>
        </header>

        <Architecture />

        <section aria-labelledby="data">
          <h2 id="data">Where the data comes from</h2>
          <div className="mt-4 grid gap-4 text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">About 38,000 fragrances</span> with notes, accords and community votes come from Fragrantica&apos;s public pages, via the open{" "}
              <a href="https://codeberg.org/decant/pages" className="underline underline-offset-2">
                Decant dataset
              </a>
              . Sillage keeps only facts and aggregates: note pyramids, accord strengths, rating, longevity, projection, season and day/night votes, and short review-theme labels with agree counts. It drops long descriptions and Fragrantica&apos;s images. Every fragrance page links back to its source.
            </p>
            <p>
              <span className="font-medium text-foreground">When search finds nothing</span>, Sillage asks{" "}
              <a href="https://world.openbeautyfacts.org" className="underline underline-offset-2">
                Open Beauty Facts
              </a>{" "}
              (an open product database) live, and caches what it returns. Those listings have no notes, so they&apos;re marked “unverified” and can be collected but not recommended.
            </p>
            <p>
              <span className="font-medium text-foreground">Prices aren&apos;t in the data.</span> The budget filter uses an estimated price band from each brand&apos;s typical pricing (395 brands mapped), always labelled as an estimate. Real prices only come from the price check.
            </p>
            <p>
              <span className="font-medium text-foreground">Images</span>: none are licensed, so each fragrance is drawn as a “scent fingerprint”, a bottle filled with its accord colours. The colours are decorative; accords are always listed in text too.
            </p>
          </div>
        </section>

        <section aria-labelledby="ranking" id="ranking">
          <h2>How recommendations are ranked</h2>
          <p className="mt-4 text-muted-foreground">
            Ranking is deterministic code with unit tests and an eval suite, not a language model. Same collection and filters, same answer. Every result carries reason codes and caveats, and every exclusion is counted.
          </p>
          <ol className="mt-6 grid gap-4">
            <Step n={1} title="Build your taste profile">
              Each owned bottle contributes its accords, weighted by how you feel about it: love 1.0, like 0.7, neutral 0.2, unrated 0.15, dislike counts against. Owning something is weak evidence; rating it is strong evidence.
            </Step>
            <Step n={2} title="Filter (hard rules, all logged)">
              Drop anything you own (including the same fragrance under another listing), anything with a note you avoid (oud also catches agarwood), anything over budget, outside a requested season or time of day, or outside your stated marketing preference. Only fragrances with 50+ votes and a 3.4+ rating are eligible. Different mode also drops near-copies of your bottles (≥ 75% accord overlap), and Fill gaps drops ≥ 85%.
            </Step>
            <Step n={3} title="Score">
              Five components, each 0–1. Taste fit (cosine similarity of accords to your profile, plus liked notes and families); the mode&apos;s goal (closeness to a loved bottle and community “smells like” votes for Similar; distance from everything you own plus a new family for Different; the size of the gap filled for Fill gaps); budget fit; season and time-of-day fit; performance fit.
              <div className="mt-3 overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-normal">Mode</th>
                      <th className="px-3 py-2 text-right font-normal">Taste</th>
                      <th className="px-3 py-2 text-right font-normal">Goal</th>
                      <th className="px-3 py-2 text-right font-normal">Budget</th>
                      <th className="px-3 py-2 text-right font-normal">Season/time</th>
                      <th className="px-3 py-2 text-right font-normal">Performance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(Object.keys(w) as (keyof typeof w)[]).map((m) => (
                      <tr key={m} className="border-t">
                        <td className="px-3 py-2 capitalize">{m === "gaps" ? "Fill gaps" : m}</td>
                        {(["preference", "objective", "budget", "context", "performance"] as const).map((k) => (
                          <td key={k} className="px-3 py-2 text-right tabular-nums">
                            {Math.round(w[m][k] * 100)}%
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-sm">The PRD&apos;s starting weights apply to Similar and Different. The eval showed that, in Fill gaps, matching current taste outvoted filling the gap, so that mode shifts ten points to its goal.</p>
            </Step>
            <Step n={4} title="Diversify and explain">
              Near-duplicates (another concentration of the same line) are skipped and no brand gets more than two of the top picks. Other versions of a bottle you own are allowed but flagged and down-weighted: that&apos;s the redundant purchase the product exists to prevent.
            </Step>
          </ol>
        </section>

        <section aria-labelledby="advisor">
          <h2 id="advisor">How the AI advisor is kept honest</h2>
          <p className="mt-4 text-muted-foreground">
            The advisor is one Claude agent with a fixed set of tools. It reads your profile, runs the engine and phrases the answer; it can&apos;t invent candidates or change scores. One agent with typed tools was a deliberate choice over a multi-agent setup: simpler to test, cheaper, and enough for the job.
          </p>
          <div className="mt-6 overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-normal">Tool</th>
                  <th className="px-3 py-2 font-normal">What it does</th>
                </tr>
              </thead>
              <tbody>
                {TOOLS.map(([t, d]) => (
                  <tr key={t} className="border-t">
                    <td className="px-3 py-2 font-mono text-xs">{t}</td>
                    <td className="px-3 py-2 text-muted-foreground">{d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="mt-6 grid gap-3 text-muted-foreground">
            <li>
              <span className="font-medium text-foreground">Output contract.</span> The agent cites fragrances by id. Before you see the answer, any id that didn&apos;t come back from a tool in that turn, and any dollar amount that didn&apos;t appear in a tool result, is removed and counted in the trace.
            </li>
            <li>
              <span className="font-medium text-foreground">No silent writes.</span> Saving to your wishlist or changing preferences always needs your click. The model never touches the database.
            </li>
            <li>
              <span className="font-medium text-foreground">Untrusted text stays data.</span> Review themes and product names come from third parties and are labelled as untrusted in tool results; there are no write tools for injected text to trigger.
            </li>
            <li>
              <span className="font-medium text-foreground">Bounded cost.</span> At most six tool rounds per answer, low reasoning effort, prompt caching on the fixed system prompt and tools, and {RATE_LIMITS.chat.limit} questions per person per hour. Each answer shows its tokens, latency and estimated cost.
            </li>
            <li>
              <span className="font-medium text-foreground">Fails safe.</span> Without a model, or when it errors or declines, a rule-based mode reads your request (mode, season, time of day, budget) and answers with the same engine, clearly labelled.
            </li>
          </ul>
        </section>

        <section aria-labelledby="prices">
          <h2 id="prices">How prices are matched</h2>
          <ul className="mt-4 grid gap-3 text-muted-foreground">
            <li>You choose the exact bottle: concentration and size. A fragrance can be found before its size is known, but it can&apos;t be priced until it is.</li>
            <li>A listing is an exact match only if brand, name, concentration and size all agree and it&apos;s a new, full, single bottle. Testers, samples, travel sizes, refills, gift sets and pre-owned bottles are rejected, and so are flankers.</li>
            <li>Unknown extra words (“Qahwa”, “Lucky”) send a listing to “Needs verification” instead of the matches. The first version used a blocklist and the eval caught it calling flankers exact.</li>
            <li>Offers are sorted by price including shipping only when every exact offer states shipping; otherwise by listed price, and the page says how many lack shipping.</li>
            <li>Live results come from Google Shopping via SerpApi, cached for {OFFER_TTL_HOURS} hours and limited to {RATE_LIMITS.offers.limit} checks per person per hour. Without a key, or when the quota runs out, you see sample offers from fictional stores, labelled as such, with no links.</li>
            <li>Sillage never claims a price is the cheapest anywhere, never claims every store was checked, and earns nothing from links.</li>
          </ul>
        </section>

        <section aria-labelledby="privacy">
          <h2 id="privacy">Privacy and security</h2>
          <ul className="mt-4 grid gap-3 text-muted-foreground">
            <li>Everything you own, rate or ask is locked to your account in the database itself (Postgres row-level security), with tests that check one user can&apos;t read another&apos;s data.</li>
            <li>API keys stay on the server. The privileged database key is used only for caching shared catalog and price data, rate-limit counters and creating demo sandboxes.</li>
            <li>The demo is a private sandbox per visitor that deletes itself after 24 hours.</li>
          </ul>
          <p className="mt-4 text-sm">
            <Link href="/privacy" className="underline underline-offset-2">
              Privacy notice
            </Link>{" "}
            ·{" "}
            <a href={`${GITHUB_URL}/blob/main/docs/DECISIONS.md`} className="underline underline-offset-2">
              Decision register
            </a>{" "}
            ·{" "}
            <Link href="/evals" className="underline underline-offset-2">
              Evals
            </Link>
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="grid grid-cols-[2rem_1fr] gap-3">
      <span className="flex size-8 items-center justify-center rounded-full bg-accent font-heading text-accent-foreground">{n}</span>
      <div>
        <p className="font-medium">{title}</p>
        <div className="mt-1 text-muted-foreground">{children}</div>
      </div>
    </li>
  );
}

/** Architecture as nested boxes: readable at any width, no image to go stale. */
function Architecture() {
  const box = "rounded-xl border bg-card p-3 text-sm";
  return (
    <figure aria-labelledby="arch-cap" className="grid gap-3 rounded-2xl border bg-muted/30 p-4">
      <div className={box}>
        <p className="font-medium">Browser</p>
        <p className="text-xs text-muted-foreground">Dashboard · Collection · Discover · Fragrance + price check · Advisor panel</p>
      </div>
      <div className="grid gap-3 rounded-xl border border-dashed p-3">
        <p className="text-xs font-medium text-muted-foreground">Next.js server (Vercel): server actions + API routes, Zod at every boundary</p>
        <div className="grid gap-3 sm:grid-cols-4">
          <div className={box}>
            <p className="font-medium">Catalog</p>
            <p className="text-xs text-muted-foreground">Fuzzy search, adapters, live fallback</p>
          </div>
          <div className={box}>
            <p className="font-medium">Engine</p>
            <p className="text-xs text-muted-foreground">Deterministic ranking, reasons, caveats</p>
          </div>
          <div className={box}>
            <p className="font-medium">Advisor</p>
            <p className="text-xs text-muted-foreground">Claude agent, 8 tools, grounding check</p>
          </div>
          <div className={box}>
            <p className="font-medium">Offers</p>
            <p className="text-xs text-muted-foreground">Variant matcher, cache, sample fallback</p>
          </div>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <div className={`${box} sm:col-span-2`}>
          <p className="font-medium">Supabase Postgres + Auth</p>
          <p className="text-xs text-muted-foreground">Catalog (shared, read-only to users) · collections, wishlists, preferences, runs, chats (row-level security)</p>
        </div>
        <div className={box}>
          <p className="font-medium">Claude API</p>
          <p className="text-xs text-muted-foreground">Optional; offline mode without it</p>
        </div>
        <div className={box}>
          <p className="font-medium">Open Beauty Facts · SerpApi</p>
          <p className="text-xs text-muted-foreground">Optional live providers</p>
        </div>
      </div>
      <figcaption id="arch-cap" className="text-xs text-muted-foreground">
        System overview. The model only ever sees tool results scoped to the signed-in user.
      </figcaption>
    </figure>
  );
}
