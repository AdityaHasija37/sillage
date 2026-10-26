import type { Metadata } from "next";
import Link from "next/link";
import { AgentWalkthrough } from "@/components/marketing/agent-walkthrough";
import { SiteFooter, SiteHeader, GITHUB_URL } from "@/components/marketing/site-header";
import { MODE_WEIGHTS } from "@/lib/recommendation/engine";
import { RATE_LIMITS } from "@/lib/security/rate";
import { OFFER_TTL_HOURS } from "@/lib/offers/service";
import { DIMENSION_LABEL, SCORE_WEIGHTS } from "@/lib/intelligence/score";
import { DAILY_WEIGHTS } from "@/lib/intelligence/daily";
import { LAB_WEIGHTS } from "@/lib/intelligence/lab";

export const metadata: Metadata = { title: "How it works", description: "Where Sillage's data comes from, how the engines rank, how the advisor agent is designed and kept grounded, and how prices are matched." };

const TOOLS: [string, string, "read" | "propose"][] = [
  ["get_user_profile", "Shelf size, family mix, season and day/night coverage, preferences", "read"],
  ["get_owned_fragrances", "Each bottle and how you rated it (ownership alone isn't treated as liking)", "read"],
  ["search_catalog", "Resolve a fragrance you mention by name", "read"],
  ["get_fragrance_details", "Notes, accords, community votes, review themes (labelled untrusted)", "read"],
  ["recommend_candidates", "Runs Discover's deterministic ranking engine", "read"],
  ["find_offers", "Variant-matched price check for one exact bottle", "read"],
  ["get_collection_score", "Your Collection Score, its five dimensions, strengths and gaps", "read"],
  ["pick_for_today", "Ranks only bottles you own for an occasion, time and temperature", "read"],
  ["propose_add_to_wishlist", "Shows you a confirm button; saves nothing by itself", "propose"],
  ["propose_preference_update", "A note to avoid, a liked note or a budget, for you to confirm", "propose"],
];

const LOOP = [
  ["Read", "Starts from your shelf and preferences, every time. A recommendation that doesn't know what you own is just a search."],
  ["Decide", "Chooses which engine fits the question: Similar, Different or Fill gaps; the score; today's pick; a price check."],
  ["Act", "Calls the tool with typed, validated inputs. Parallel calls where it can, at most six rounds in total."],
  ["Inspect", "Reads the results, and looks closer at the best candidate when the answer depends on it."],
  ["Check", "Before you see anything, every cited fragrance and price is matched against what the tools returned."],
  ["Answer", "Explains in plain English, with each pick linked and the engine's caveats kept."],
];

export default function HowItWorks() {
  const w = MODE_WEIGHTS;
  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main>
        <header className="grain border-b border-foreground/15">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <p className="label">How it works</p>
            <h1 className="mt-4 max-w-4xl text-6xl leading-[0.98] sm:text-7xl">
              Deterministic engines, <em className="text-primary">an agent that explains them.</em>
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-muted-foreground">Where the data comes from, how ranking and scoring work, why the advisor is an agent, and what it is and isn&apos;t allowed to do.</p>
            <nav aria-label="On this page" className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              {[
                ["#value", "Why it exists"],
                ["#data", "Data"],
                ["#ranking", "Ranking"],
                ["#intelligence", "Score, Today, Scent Lab"],
                ["#advisor", "The advisor agent"],
                ["#prices", "Prices"],
                ["#privacy", "Privacy"],
              ].map(([h, l]) => (
                <a key={h} href={h} className="underline decoration-border underline-offset-4 hover:decoration-primary">
                  {l}
                </a>
              ))}
            </nav>
          </div>
        </header>

        <div className="mx-auto grid max-w-6xl gap-24 px-4 py-20 sm:px-6 [&_p]:leading-relaxed">
          <Section id="value" n="01" title="Why it exists">
            <div className="grid gap-8 md:grid-cols-3">
              <Job title="Know what you have" body="A shelf of twelve bottles is hard to see as a whole. Sillage maps it: families, signature accords, which seasons and occasions you can actually cover." />
              <Job title="Buy the right next one" body="Recommendations start from what you own and what you've said you like, and every pick explains itself, so you can tell a real gap from a fifth version of the same scent." />
              <Job title="Use what you own better" body="Most collections are under-worn. Today picks from your own shelf; Scent Lab helps you try pairings and learn from how they actually wore." />
            </div>
            <p className="mt-8 max-w-3xl text-muted-foreground">
              The bet is that collection context makes advice much more relevant, and that it&apos;s only trustworthy if every claim traces back to data. That&apos;s a hypothesis: the{" "}
              <Link href="/evals" className="underline underline-offset-2">
                evals
              </Link>{" "}
              test that the system behaves as designed, not yet that people prefer it.
            </p>
          </Section>

          <Section id="data" n="02" title="Where the data comes from">
            <div className="grid gap-6 text-muted-foreground md:grid-cols-2">
              <p>
                <span className="text-foreground">About 38,000 fragrances</span> with notes, accords and community votes come from Fragrantica&apos;s public pages via the open{" "}
                <a href="https://codeberg.org/decant/pages" className="underline underline-offset-2">
                  Decant dataset
                </a>
                . Sillage keeps facts and aggregates only (note pyramids, accord strengths, ratings, longevity, projection, season and day/night votes, short review themes) and links each page back to its source.
              </p>
              <p>
                <span className="text-foreground">When search finds nothing</span>, Open Beauty Facts is queried live. Those listings have no notes, so they&apos;re marked unverified and can be collected but not recommended.
              </p>
              <p>
                <span className="text-foreground">Prices aren&apos;t in the data.</span> Budget filtering uses estimated price bands from each brand&apos;s typical pricing (395 brands), always labelled as estimates. Real prices only come from the price check.
              </p>
              <p>
                <span className="text-foreground">Occasion fit isn&apos;t in the data either.</span> It&apos;s inferred from day/night votes, projection and accords, labelled &ldquo;estimated&rdquo; wherever it appears, and lowers confidence.
              </p>
            </div>
          </Section>

          <Section id="ranking" n="03" title="How recommendations are ranked">
            <p className="max-w-3xl text-muted-foreground">Tested code, not a language model: the same shelf and filters give the same answer. Every result carries reasons and caveats, and every exclusion is counted.</p>
            <ol className="mt-8 grid gap-6 md:grid-cols-2">
              <Step n="1" title="Taste profile">Each bottle contributes its accords, weighted by your rating: love 1.0, like 0.7, neutral 0.2, unrated 0.15, dislike counts against.</Step>
              <Step n="2" title="Hard filters">Owned bottles, notes you avoid (oud also catches agarwood), budget, season, time of day and marketing preference. Different drops near-copies (≥ 75% overlap); Fill gaps drops ≥ 85%.</Step>
              <Step n="3" title="Score">Taste fit, the mode&apos;s goal, budget, season/time and performance, weighted per mode (below).</Step>
              <Step n="4" title="Diversify">At most two picks per brand; other versions of a bottle you own are flagged, and budget alternatives are labelled with what they resemble.</Step>
            </ol>
            <WeightsTable
              caption="Weights by mode"
              columns={["Taste", "Goal", "Budget", "Season/time", "Performance"]}
              rows={(Object.keys(w) as (keyof typeof w)[]).map((m) => [m === "gaps" ? "Fill gaps" : m[0].toUpperCase() + m.slice(1), ...(["preference", "objective", "budget", "context", "performance"] as const).map((k) => w[m][k])])}
            />
          </Section>

          <Section id="intelligence" n="04" title="Collection Score, Today and Scent Lab">
            <p className="max-w-3xl text-muted-foreground">Three features on one shared fragrance profile. Every number is calculated by versioned code; when data is missing, that factor is left out and the rest reweighted. It never counts as zero.</p>
            <div className="mt-10 grid gap-12 lg:grid-cols-3">
              <div>
                <h3 className="text-3xl">Collection Score</h3>
                <p className="mt-2 text-sm text-muted-foreground">How far your shelf reaches, 0–100. A coverage description, never a judgement of taste, and owning more doesn&apos;t raise it by itself. Preview any bottle to see the change before you buy.</p>
                <WeightsTable compact caption="Dimensions" columns={["Weight"]} rows={(Object.keys(SCORE_WEIGHTS) as (keyof typeof SCORE_WEIGHTS)[]).map((k) => [DIMENSION_LABEL[k], SCORE_WEIGHTS[k]])} />
              </div>
              <div>
                <h3 className="text-3xl">Today</h3>
                <p className="mt-2 text-sm text-muted-foreground">Ranks only bottles you own for an occasion, time of day, weather and intensity. Weather is manual unless you choose to share location, which is rounded and never stored.</p>
                <WeightsTable compact caption="Factors" columns={["Weight"]} rows={(Object.keys(DAILY_WEIGHTS) as (keyof typeof DAILY_WEIGHTS)[]).map((k) => [k === "daypart" ? "Time of day" : k === "rotation" ? "Rotation (under-worn)" : k[0].toUpperCase() + k.slice(1), DAILY_WEIGHTS[k]])} />
              </div>
              <div>
                <h3 className="text-3xl">Scent Lab</h3>
                <p className="mt-2 text-sm text-muted-foreground">A labelled heuristic for two of your bottles, from a small editable ruleset of complementary and tension accords. Not chemistry. Your wear ratings move similar pairings by at most ±10 points.</p>
                <WeightsTable compact caption="Components" columns={["Weight"]} rows={[["Accord complementarity", LAB_WEIGHTS.complementarity], ["Low clash risk", LAB_WEIGHTS.clashInverse], ["Intensity balance", LAB_WEIGHTS.intensityBalance], ["Family balance", LAB_WEIGHTS.familyBalance], ["Your preference", LAB_WEIGHTS.preferenceFit]]} />
              </div>
            </div>
          </Section>
        </div>

        <section id="advisor" className="scroll-mt-4 bg-ink text-ink-foreground">
          <div className="mx-auto grid max-w-6xl gap-16 px-4 py-24 sm:px-6">
            <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr]">
              <div>
                <p className="font-mono text-[11px] tracking-[0.08em] text-[oklch(0.8_0.1_55)] uppercase">05 · The advisor agent</p>
                <h2 className="mt-4 text-5xl leading-[1.02]">
                  Why an agent, <em className="text-[oklch(0.82_0.1_55)]">and why only one.</em>
                </h2>
                <div className="mt-6 grid gap-4 text-ink-foreground/75">
                  <p>
                    A question like &ldquo;a woody winter scent under $150 that isn&apos;t like anything I own&rdquo; isn&apos;t one lookup. It means reading the shelf, translating &ldquo;isn&apos;t like anything I own&rdquo; into Different mode, setting the season and budget, checking the top pick more closely, and explaining the trade-offs. A fixed pipeline handles one shape of question; an agent can plan the steps for each one.
                  </p>
                  <p>
                    What the agent doesn&apos;t do matters as much. It doesn&apos;t rank fragrances, score collections or pair bottles itself: deterministic, tested engines do, and the agent calls them as tools. That keeps the numbers reproducible and the language flexible.
                  </p>
                  <p>One agent with ten typed tools is enough for this job. A multi-agent setup would add cost, latency and failure modes without a clear benefit, so it was left out on purpose.</p>
                  <p>
                    The loop is model-agnostic. It runs on Google Gemini&apos;s free tier today and on Anthropic&apos;s Claude with one environment variable; the tools, the six-round cap and the grounding check are identical either way, and every answer&apos;s trace names the model that wrote it.
                  </p>
                </div>
              </div>
              <div className="rounded-md border border-white/10 bg-white/[0.03] p-6">
                <AgentWalkthrough />
              </div>
            </div>

            <div>
              <h3 className="text-3xl">The loop</h3>
              <ol className="mt-6 grid gap-px overflow-hidden rounded-md border border-white/10 bg-white/10 sm:grid-cols-3 lg:grid-cols-6">
                {LOOP.map(([t, d], i) => (
                  <li key={t} className="bg-ink p-5">
                    <p className="font-mono text-[11px] text-[oklch(0.8_0.1_55)]">0{i + 1}</p>
                    <p className="mt-1 font-heading text-2xl">{t}</p>
                    <p className="mt-2 text-sm text-ink-foreground/65">{d}</p>
                  </li>
                ))}
              </ol>
            </div>

            <div className="grid gap-12 lg:grid-cols-2">
              <div>
                <h3 className="text-3xl">Its tools</h3>
                <table className="mt-5 w-full text-sm">
                  <tbody>
                    {TOOLS.map(([t, d, kind]) => (
                      <tr key={t} className="border-t border-white/10">
                        <td className="py-2.5 pr-3 font-mono text-[12px] text-[oklch(0.85_0.09_60)]">{t}</td>
                        <td className="py-2.5 text-ink-foreground/70">{d}</td>
                        <td className="py-2.5 pl-3 text-right font-mono text-[10px] tracking-wider text-ink-foreground/65 uppercase">{kind}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div>
                <h3 className="text-3xl">Guardrails and failure modes</h3>
                <ul className="mt-5 grid gap-4 text-sm text-ink-foreground/75">
                  <li>
                    <span className="text-ink-foreground">Output contract.</span> Fragrances are cited by id. Any id that didn&apos;t come back from a tool in that turn, and any dollar amount that didn&apos;t appear in a tool result, is removed and counted in the trace. In the eval, 0 of 7 planted fabrications got through.
                  </li>
                  <li>
                    <span className="text-ink-foreground">No silent writes.</span> Saving or changing preferences goes through &ldquo;propose&rdquo; tools that render a confirm button. The model never touches the database.
                  </li>
                  <li>
                    <span className="text-ink-foreground">Prompt injection.</span> Review themes and product names come from third parties and are labelled untrusted in tool results; with no write tools, there&apos;s nothing for injected text to trigger.
                  </li>
                  <li>
                    <span className="text-ink-foreground">Bounded cost.</span> Six tool rounds at most, low reasoning effort, prompt caching on the fixed instructions and tools, {RATE_LIMITS.chat.limit} questions per person per hour; every answer shows its tokens, latency and estimated cost.
                  </li>
                  <li>
                    <span className="text-ink-foreground">Graceful degradation.</span> With no model, or on an error or decline, a rule-based mode answers recommendations, score and &ldquo;what to wear&rdquo; questions with the same engines, and says so.
                  </li>
                  <li>
                    <span className="text-ink-foreground">Same rules elsewhere.</span> Today&apos;s explanation can be phrased by the model, but only from the ranker&apos;s factors: if it names the wrong bottle or introduces a new number, the template is used instead.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto grid max-w-6xl gap-24 px-4 py-20 sm:px-6 [&_p]:leading-relaxed">
          <Section id="prices" n="06" title="How prices are matched">
            <ul className="grid gap-3 text-muted-foreground md:grid-cols-2">
              <li>You choose the exact bottle: concentration and size. A fragrance can be found before its size is known, but not priced until it is.</li>
              <li>An exact match needs the same brand, name, concentration and size, and a new, full, single bottle. Testers, samples, refills, gift sets, pre-owned and flankers are set aside.</li>
              <li>Unknown extra words (&ldquo;Qahwa&rdquo;, &ldquo;Lucky&rdquo;) go to &ldquo;Needs verification&rdquo;. The first version used a blocklist and the eval caught it calling flankers exact.</li>
              <li>
                Live results come from Google Shopping via SerpApi, cached {OFFER_TTL_HOURS} h, {RATE_LIMITS.offers.limit} checks per person per hour. Otherwise you see labelled sample offers from fictional stores, with no links. Never &ldquo;cheapest anywhere&rdquo;.
              </li>
            </ul>
          </Section>
          <Section id="privacy" n="07" title="Privacy and security">
            <ul className="grid gap-3 text-muted-foreground md:grid-cols-2">
              <li>Everything you own, rate, wear, pair or ask is locked to your account in the database itself (row-level security), with tests that one user can&apos;t read another&apos;s data.</li>
              <li>API keys stay on the server; the privileged database key is used only for shared caches, rate limits and demo sandboxes.</li>
              <li>Location for live weather is optional, rounded to about 10 km, used once and never stored.</li>
              <li>Product analytics record only an allowlist of event names and safe properties: never notes, location or chat text.</li>
            </ul>
            <p className="mt-6 text-sm">
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
          </Section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Section({ id, n, title, children }: { id: string; n: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-4">
      <p className="label">{n}</p>
      <h2 id={`${id}-h`} className="mt-2 mb-8 text-5xl leading-tight">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Job({ title, body }: { title: string; body: string }) {
  return (
    <div className="border-t-2 border-primary pt-4">
      <h3 className="text-2xl">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <li className="grid grid-cols-[2.5rem_1fr] gap-3">
      <span className="font-heading text-4xl text-primary/70 italic">{n}</span>
      <div>
        <p className="font-heading text-2xl">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{children}</p>
      </div>
    </li>
  );
}

function WeightsTable({ caption, columns, rows, compact = false }: { caption: string; columns: string[]; rows: (string | number)[][]; compact?: boolean }) {
  return (
    <div className={compact ? "mt-5" : "mt-10 overflow-x-auto"}>
      <table className="w-full text-sm">
        <caption className="label mb-2 text-left">{caption}</caption>
        {!compact && (
          <thead>
            <tr className="border-b border-foreground/20">
              <th className="py-2 text-left font-normal">
                <span className="sr-only">Row</span>
              </th>
              {columns.map((c) => (
                <th key={c} className="label py-2 text-right !font-normal">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map(([name, ...vals]) => (
            <tr key={String(name)} className="border-b border-foreground/10">
              <th scope="row" className="py-2 text-left font-normal">
                {name}
              </th>
              {vals.map((v, i) => (
                <td key={i} className="py-2 text-right font-mono tabular-nums">
                  {Math.round(Number(v) * 100)}%
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
