import Link from "next/link";
import { ArrowRight, BadgeCheck, Compass, Layers, ListChecks, ShieldCheck, Sparkles, Tags, Wrench } from "lucide-react";
import { SubmitButton } from "@/components/forms/submit-button";
import { buttonVariants } from "@/components/ui/button";
import { ScentSwatch } from "@/components/fragrance/scent-swatch";
import { SiteFooter, SiteHeader } from "@/components/marketing/site-header";
import { demoEnabled } from "@/lib/demo/provision";
import { startDemo } from "@/app/demo/actions";
import evals from "@/docs/evals/latest.json";

export default async function Home({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const showDemo = demoEnabled();
  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-8 pb-20 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-16">
          <div>
            <p className="text-sm font-medium tracking-wide text-primary uppercase">Fragrance collection × grounded AI advisor</p>
            <h1 className="mt-4 text-5xl leading-[1.05] font-medium tracking-tight sm:text-6xl">Know your shelf. Find your next bottle.</h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Sillage maps the fragrances you own, shows what they say about your taste, and recommends what to try next, with the reasons, the caveats and an honest price check for the exact bottle.
            </p>
            {params.demo === "busy" && (
              <p role="alert" className="mt-6 rounded-lg border border-warning/40 bg-warning/5 px-3 py-2 text-sm">
                The demo is busy right now. Try again in a minute, or create a free account.
              </p>
            )}
            <div className="mt-8 flex flex-wrap gap-3">
              {showDemo && (
                <form action={startDemo}>
                  <SubmitButton size="lg" className="h-11 px-5 text-base" pendingLabel="Setting up a sample collection…">
                    Try the live demo, no sign-up <ArrowRight aria-hidden="true" />
                  </SubmitButton>
                </form>
              )}
              <Link href="/register" className={buttonVariants({ size: "lg", variant: showDemo ? "outline" : "default", className: "h-11 px-5 text-base" })}>
                Create my collection
              </Link>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">A private sample collection, ready in seconds. The full walkthrough takes about two minutes.</p>
          </div>
          <HeroVisual />
        </section>

        <section className="border-y bg-card/60">
          <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-8 sm:px-6 md:grid-cols-4">
            <Stat label="Fragrances searchable" value={evals.catalog.fragrances.toLocaleString("en-US")} />
            <Stat label="Exact-match precision on adversarial offers" value={`${Math.round(evals.offers.precision * 100)}%`} />
            <Stat label="Recommendation cases passing" value={`${evals.recommendations.passed}/${evals.recommendations.total}`} />
            <Stat label="Fabricated products or prices in tests" value={String(evals.grounding.fabricated)} />
          </dl>
          <p className="mx-auto max-w-6xl px-4 pb-6 text-xs text-muted-foreground sm:px-6">
            Measured by the project&apos;s own eval suite on {evals.generatedAt.slice(0, 10)}.{" "}
            <Link href="/evals" className="underline underline-offset-2">
              See the method and every case
            </Link>
            .
          </p>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="max-w-2xl text-4xl font-medium tracking-tight">Recommendations that start from what you own</h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">A generic chatbot doesn&apos;t know your shelf. A spreadsheet doesn&apos;t suggest anything. Sillage connects the two, and says why.</p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <Feature icon={Layers} title="Similar" body="More of what you love, anchored on the bottles you rated highly, including community “smells like” votes." />
            <Feature icon={Compass} title="Different" body="A new direction that still connects to your taste. Near-copies of what you own are excluded, not just ranked lower." />
            <Feature icon={Sparkles} title="Fill gaps" body="Finds the seasons, times of day and families your shelf is missing, and refuses to invent a gap when there isn't one." />
          </div>
        </section>

        <section className="bg-ink text-ink-foreground">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2">
            <div>
              <p className="text-sm font-medium tracking-wide text-[color-mix(in_oklch,var(--primary),white_35%)] uppercase">The AI design</p>
              <h2 className="mt-3 text-4xl font-medium tracking-tight">An advisor that can&apos;t make things up</h2>
              <p className="mt-4 text-ink-foreground/75">
                The advisor is a Claude tool-using agent, but it doesn&apos;t pick fragrances. A deterministic engine ranks them, and the agent explains the results in plain language. What it says is checked before you see it.
              </p>
              <ul className="mt-8 grid gap-5">
                <Point icon={ListChecks} title="Deterministic ranking, AI explanation" body="Scores, exclusions and reasons come from tested code. The model can't add a candidate or change a score." />
                <Point icon={ShieldCheck} title="Grounding check on every answer" body="Every fragrance it cites must have come back from a tool in that turn, and every price from a tool result. Anything else is stripped and counted." />
                <Point icon={BadgeCheck} title="Writes need your click" body="It can propose saving to your wishlist or updating preferences; only you can confirm. Third-party text is treated as data, never as instructions." />
                <Point icon={Wrench} title="Inspectable and fail-safe" body="Each answer shows its tool calls, latency and cost. If the model is unavailable, a rule-based mode answers with the same engine." />
              </ul>
            </div>
            <TraceVisual />
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2">
          <OfferVisual />
          <div>
            <Tags className="size-6 text-primary" aria-hidden="true" />
            <h2 className="mt-3 text-4xl font-medium tracking-tight">Price checks for the exact bottle</h2>
            <p className="mt-4 text-muted-foreground">
              The cheapest-looking listing is often the wrong one: the EDT when you wanted EDP, 50 ml instead of 100, a tester, a flanker. Sillage matches brand, concentration, size and edition, shows what it rejected and why, and only compares totals when shipping is known.
            </p>
            <p className="mt-4 text-sm text-muted-foreground">Live results come from Google Shopping when configured. Otherwise you&apos;ll see clearly labelled sample offers, never invented real prices.</p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
          <div className="rounded-3xl border bg-accent/50 p-8 sm:p-12">
            <h2 className="text-3xl font-medium tracking-tight">See it in two minutes</h2>
            <ol className="mt-4 grid gap-2 text-muted-foreground sm:grid-cols-2">
              <li>1. Look at the sample shelf: scent mix and season coverage.</li>
              <li>2. Open Discover and choose Fill gaps.</li>
              <li>3. Ask the advisor for a winter scent unlike anything you own.</li>
              <li>4. Pick a size and concentration, then compare prices.</li>
            </ol>
            <div className="mt-6 flex flex-wrap gap-3">
              {showDemo && (
                <form action={startDemo}>
                  <SubmitButton size="lg" pendingLabel="Setting up…">
                    Start the demo
                  </SubmitButton>
                </form>
              )}
              <Link href="/how-it-works" className={buttonVariants({ size: "lg", variant: "outline" })}>
                Read how it works
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-heading text-3xl font-medium tabular-nums">{value}</dd>
    </div>
  );
}

function Feature({ icon: Icon, title, body }: { icon: typeof Layers; title: string; body: string }) {
  return (
    <div className="rounded-2xl border bg-card p-6">
      <Icon className="size-5 text-primary" aria-hidden="true" />
      <h3 className="mt-3 text-xl">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

function Point({ icon: Icon, title, body }: { icon: typeof Layers; title: string; body: string }) {
  return (
    <li className="flex gap-3">
      <Icon className="mt-0.5 size-5 shrink-0 text-[color-mix(in_oklch,var(--primary),white_35%)]" aria-hidden="true" />
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-ink-foreground/70">{body}</p>
      </div>
    </li>
  );
}

/** Static illustration of the product, built from real components and labelled as such. */
function HeroVisual() {
  const shelf = [
    { name: "Bleu de Chanel", accords: [{ name: "citrus", strength: 100 }, { name: "woody", strength: 80 }, { name: "fresh spicy", strength: 60 }] },
    { name: "Tobacco Vanille", accords: [{ name: "vanilla", strength: 100 }, { name: "sweet", strength: 90 }, { name: "tobacco", strength: 80 }] },
    { name: "Jazz Club", accords: [{ name: "boozy", strength: 100 }, { name: "tobacco", strength: 70 }, { name: "vanilla", strength: 60 }] },
    { name: "Wood Sage & Sea Salt", accords: [{ name: "aromatic", strength: 100 }, { name: "salty", strength: 80 }, { name: "woody", strength: 50 }] },
  ];
  return (
    <figure aria-label="Illustration of Sillage: a sample shelf and one recommendation" className="relative">
      <div className="rounded-3xl border bg-card p-6 shadow-sm">
        <p className="text-xs text-muted-foreground">Sample shelf</p>
        <div className="mt-3 flex items-end gap-3">
          {shelf.map((s) => (
            <div key={s.name} className="grid justify-items-center gap-1">
              <ScentSwatch accords={s.accords} size="md" />
              <span className="w-20 truncate text-center text-[11px] text-muted-foreground">{s.name}</span>
            </div>
          ))}
        </div>
        <div className="mt-6 rounded-2xl border bg-background p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground uppercase">Fill gaps · Rank 1</p>
              <p className="font-heading text-xl">A chypre for fall evenings</p>
            </div>
            <div className="text-right">
              <p className="font-heading text-2xl">78%</p>
              <p className="text-[11px] text-muted-foreground">estimated fit</p>
            </div>
          </div>
          <ul className="mt-3 grid gap-1 text-sm">
            <li>✓ Adds chypre (you own 0)</li>
            <li>✓ Community votes favour it for fall</li>
            <li className="text-muted-foreground">! Price band estimated from the brand&apos;s typical pricing</li>
          </ul>
        </div>
      </div>
      <figcaption className="mt-3 text-center text-xs text-muted-foreground">Illustration. In the demo, every result comes from live ranking over the real catalog.</figcaption>
    </figure>
  );
}

function TraceVisual() {
  const steps = ["Read your profile · 6 bottles", "Ran the recommendation engine · different, winter, ≤ $150", "Read fragrance details · top pick"];
  return (
    <figure aria-label="Illustration of the advisor's tool trace" className="self-center rounded-3xl border border-white/10 bg-white/5 p-6">
      <p className="rounded-2xl rounded-br-sm bg-white/10 px-4 py-2 text-sm">Suggest a woody winter fragrance under $150 that isn&apos;t close to what I own.</p>
      <div className="mt-4 rounded-2xl border border-white/10 p-4 text-sm leading-relaxed text-ink-foreground/85">
        Three picks that move away from your fresh bottles while keeping the woody thread you like, each linked to its page, with the caveats the engine reported…
      </div>
      <div className="mt-4 grid gap-1.5 rounded-xl bg-black/20 p-4 font-mono text-xs text-ink-foreground/70">
        <p className="text-ink-foreground/90">How I got this · 3 tool calls</p>
        {steps.map((s, i) => (
          <p key={s}>
            {i + 1}. {s}
          </p>
        ))}
        <p className="mt-1 text-[color-mix(in_oklch,var(--success),white_30%)]">✓ Grounding check: 3 cited, all returned by a tool</p>
      </div>
      <figcaption className="mt-3 text-xs text-ink-foreground/50">Illustration of the trace shown under every advisor answer.</figcaption>
    </figure>
  );
}

function OfferVisual() {
  const rows = [
    ["Sample Store North", "Eau de Parfum 100 ml", "Exact"],
    ["Sample Outlet", "Eau de Parfum 100 ml", "Exact"],
    ["Sample Store East", "Eau de Toilette 100 ml", "Rejected: different concentration"],
    ["Sample Outlet", "Eau de Parfum 100 ml Tester", "Rejected: tester"],
    ["Sample Marketplace", "Intense Eau de Parfum 100 ml", "Rejected: flanker"],
  ];
  return (
    <figure aria-label="Illustration of variant-aware offer matching" className="rounded-3xl border bg-card p-6">
      <p className="text-xs text-muted-foreground">Looking for: Eau de Parfum, 100 ml</p>
      <ul className="mt-3 grid gap-2 text-sm">
        {rows.map(([m, t, s]) => (
          <li key={m + t} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
            <span className="min-w-0">
              <span className="block font-medium">{m}</span>
              <span className="block truncate text-xs text-muted-foreground">{t}</span>
            </span>
            <span className={s === "Exact" ? "text-xs font-medium text-success" : "text-right text-xs text-muted-foreground"}>{s}</span>
          </li>
        ))}
      </ul>
      <figcaption className="mt-3 text-xs text-muted-foreground">Illustration using sample stores.</figcaption>
    </figure>
  );
}
