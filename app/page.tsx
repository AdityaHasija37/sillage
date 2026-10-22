import Link from "next/link";
import { ArrowRight, Check, Minus, X } from "lucide-react";
import { SubmitButton } from "@/components/forms/submit-button";
import { ScentSwatch } from "@/components/fragrance/scent-swatch";
import { AgentWalkthrough } from "@/components/marketing/agent-walkthrough";
import { HeroSearch } from "@/components/marketing/hero-search";
import { SiteFooter, SiteHeader } from "@/components/marketing/site-header";
import { showcaseShelf } from "@/lib/catalog/showcase";
import { demoEnabled } from "@/lib/demo/provision";
import { FAMILY_LABEL, type Fragrance } from "@/lib/domain/fragrance";
import { startDemo } from "@/app/demo/actions";
import evals from "@/docs/evals/latest.json";

const BRANDS = ["Dior", "Chanel", "Creed", "Le Labo", "Maison Francis Kurkdjian", "Lattafa", "Tom Ford", "Guerlain", "Hermès", "Byredo", "Armaf", "Parfums de Marly", "Diptyque", "Yves Saint Laurent", "Xerjoff", "Amouage"];

export default async function Home({ searchParams }: PageProps<"/">) {
  const [params, shelf] = await Promise.all([searchParams, showcaseShelf(10)]);
  const showDemo = demoEnabled();

  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main>
        {/* ── Hero ─────────────────────────────────────────────── */}
        <section className="grain">
          <div className="mx-auto grid max-w-6xl gap-14 px-4 pt-12 pb-20 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-20">
            <div>
              <p className="label">No. 01 · A companion for your collection</p>
              <h1 className="mt-5 text-6xl leading-[0.95] sm:text-7xl lg:text-[5.4rem]">
                Know your shelf.
                <br />
                <em className="text-primary">Find your next bottle.</em>
              </h1>
              <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
                Sillage reads the fragrances you own, shows what they say about your taste and where your shelf has gaps, then suggests what to try next, and explains every pick.
              </p>
              <div className="mt-9">
                <HeroSearch />
              </div>
              {params.demo === "busy" && (
                <p role="alert" className="mt-6 border-l-2 border-warning pl-3 text-sm">
                  The demo is busy right now. Try again in a minute, or create a free account.
                </p>
              )}
              <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3">
                {showDemo && (
                  <form action={startDemo}>
                    <SubmitButton size="lg" className="h-12 rounded-full bg-ink px-6 text-base text-ink-foreground hover:bg-[color-mix(in_oklch,var(--ink),white_12%)]" pendingLabel="Stocking your sample shelf…">
                      Open a sample shelf <ArrowRight aria-hidden="true" />
                    </SubmitButton>
                  </form>
                )}
                <Link href="/register" className="text-sm underline decoration-border underline-offset-4 hover:decoration-primary">
                  or start your own, free
                </Link>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">No sign-up for the sample: six bottles, ready in seconds, gone after 24 hours.</p>
            </div>
            <ShelfScene shelf={shelf} />
          </div>
        </section>

        {/* ── Brand marquee ─────────────────────────────────────── */}
        <div className="overflow-hidden border-y border-foreground/15 bg-ink py-3 text-ink-foreground" aria-hidden="true">
          <div className="flex w-max animate-[marquee_60s_linear_infinite] gap-10 motion-reduce:animate-none">
            {[...BRANDS, ...BRANDS].map((b, i) => (
              <span key={i} className="font-heading text-xl whitespace-nowrap italic opacity-80">
                {b} <span className="ml-10 not-italic opacity-40">·</span>
              </span>
            ))}
          </div>
        </div>

        {/* ── The problem ───────────────────────────────────────── */}
        <section className="mx-auto grid max-w-6xl gap-12 px-4 py-24 sm:px-6 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <p className="label">The problem</p>
            <h2 className="mt-4 text-5xl leading-[1.02]">
              Twelve bottles in, people still buy <em>the wrong next one.</em>
            </h2>
          </div>
          <ol className="grid gap-8 border-l border-foreground/15 pl-8">
            <Problem n="01" title="A fifth fresh blue scent">
              Without seeing the shelf as a whole, it&apos;s easy to keep buying the same profile under different names, and to miss that nothing covers a summer evening.
            </Problem>
            <Problem n="02" title="Advice that doesn’t know you">
              Databases know every perfume but not your collection. Chatbots recommend confidently, don&apos;t know what you own, and will invent a price if you ask.
            </Problem>
            <Problem n="03" title="The right scent, the wrong bottle">
              The cheapest-looking listing is often the EDT when you wanted the EDP, a 50 ml, a tester or a flanker with a similar name.
            </Problem>
          </ol>
        </section>

        {/* ── Comparison ────────────────────────────────────────── */}
        <section className="border-y border-foreground/15 bg-card/70">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 className="text-4xl">Why not just use…</h2>
              <p className="max-w-sm text-sm text-muted-foreground">Sillage connects the pieces the usual tools keep separate.</p>
            </div>
            <div className="mt-8 overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-foreground/20">
                    <th scope="col" className="py-3 pr-4 font-normal">
                      <span className="sr-only">Capability</span>
                    </th>
                    {["Fragrance database", "A chatbot", "A spreadsheet", "Sillage"].map((h) => (
                      <th key={h} scope="col" className={`label px-3 py-3 text-center ${h === "Sillage" ? "!text-primary" : ""}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {(
                    [
                      ["Knows what you own and how you rate it", "no", "no", "yes", "yes"],
                      ["Spots the gaps in your collection", "no", "partly", "no", "yes"],
                      ["Explains why a pick fits, with caveats", "no", "partly", "no", "yes"],
                      ["Can't invent a fragrance or a price", "yes", "no", "yes", "yes"],
                      ["Checks prices for the exact bottle", "no", "no", "no", "yes"],
                    ] as const
                  ).map(([cap, ...cells]) => (
                    <tr key={cap} className="border-b border-foreground/10">
                      <th scope="row" className="py-3.5 pr-4 font-normal">
                        {cap}
                      </th>
                      {cells.map((c, i) => (
                        <td key={i} className={`px-3 py-3.5 text-center ${i === 3 ? "bg-accent/50" : ""}`}>
                          <Mark v={c} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── Three acts ────────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <p className="label">How it works</p>
          <div className="mt-10 grid gap-20">
            <Act n="I" title="Your shelf, mapped" body="Add what you own (typos are fine). Rate what you love; ownership alone counts for little. Sillage shows your scent mix, your signature accords and which seasons and times of day you can actually cover.">
              <CoverageSample />
            </Act>
            <Act flip n="II" title="Three ways to look for the next one" body="Similar, for more of what you love. Different, for a real change that still connects to your taste. Fill gaps, for what your shelf is missing. A deterministic engine ranks 3,000 well-reviewed candidates and every pick says why, and what's uncertain.">
              <PickSample />
            </Act>
            <Act n="III" title="A price check for the exact bottle" body="Choose the concentration and size. Testers, flankers, wrong sizes and gift sets are set aside with the reason shown, and totals are only compared when shipping is known.">
              <OfferSample />
            </Act>
          </div>
        </section>

        {/* ── The agent ─────────────────────────────────────────── */}
        <section id="advisor" className="bg-ink text-ink-foreground">
          <div className="mx-auto grid max-w-6xl gap-14 px-4 py-24 sm:px-6 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <p className="font-mono text-[11px] tracking-[0.08em] text-[oklch(0.78_0.1_55)] uppercase">The advisor</p>
              <h2 className="mt-4 text-5xl leading-[1.02]">
                An agent with a job description, <em className="text-[oklch(0.8_0.1_55)]">not a chatbot with opinions.</em>
              </h2>
              <p className="mt-6 leading-relaxed text-ink-foreground/75">
                Some questions need several steps: read the shelf, decide which kind of search fits, run it, look closer at the best pick, maybe price it, then explain. That&apos;s what the advisor does. It&apos;s a Claude agent that plans and calls Sillage&apos;s own tools. It never ranks fragrances itself and never touches your data without asking.
              </p>
              <dl className="mt-10 grid gap-px overflow-hidden rounded-md border border-white/10 bg-white/10 text-sm sm:grid-cols-3">
                <Perm title="Reads" items={["Your profile and ratings", "The catalog", "Engine results", "Prices for one bottle"]} />
                <Perm title="Proposes" items={["Saving to your wishlist", "Avoiding a note", "A new budget"]} note="You confirm with a click" />
                <Perm title="Never" items={["Picks or ranks on its own", "Cites what no tool returned", "Quotes an unverified price", "Buys anything"]} />
              </dl>
              <p className="mt-6 text-sm text-ink-foreground/60">
                One agent, ten typed tools, at most six steps per answer. No model configured? It falls back to a rule-based mode that uses the same engine and says so.{" "}
                <Link href="/how-it-works#advisor" className="underline underline-offset-4 hover:text-ink-foreground">
                  The full design
                </Link>
              </p>
            </div>
            <div className="rounded-md border border-white/10 bg-white/[0.03] p-5 sm:p-7">
              <AgentWalkthrough />
            </div>
          </div>
        </section>

        {/* ── Proof ─────────────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-[1fr_2fr]">
            <div>
              <p className="label">Measured, not claimed</p>
              <h2 className="mt-4 text-4xl leading-tight">Tested against cases written before the first run.</h2>
              <Link href="/evals" className="mt-5 inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline">
                Every case and result <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
            <dl className="grid grid-cols-2 gap-x-8 gap-y-10 border-t border-foreground/15 pt-8 sm:grid-cols-4 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-10">
              <Proof value={evals.catalog.fragrances.toLocaleString("en-US")} label="fragrances searchable" />
              <Proof value={`${Math.round(evals.offers.precision * 100)}%`} label={`precision matching the exact bottle (${evals.offers.pairs} tricky listings)`} />
              <Proof value={`${evals.recommendations.passed}/${evals.recommendations.total}`} label="shopper personas fully passing" />
              <Proof value={String(evals.grounding.fabricated)} label="invented products or prices reaching users" />
            </dl>
          </div>
        </section>

        {/* ── Close ─────────────────────────────────────────────── */}
        <section className="grain border-t border-foreground/15">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-8 px-4 py-20 sm:px-6">
            <h2 className="max-w-xl text-5xl leading-[1.02]">
              Two minutes with a <em className="text-primary">sample shelf.</em>
            </h2>
            {showDemo && (
              <form action={startDemo}>
                <SubmitButton size="lg" className="h-12 rounded-full bg-ink px-6 text-base text-ink-foreground hover:bg-[color-mix(in_oklch,var(--ink),white_12%)]" pendingLabel="Stocking your sample shelf…">
                  Open the sample shelf <ArrowRight aria-hidden="true" />
                </SubmitButton>
              </form>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function ShelfScene({ shelf }: { shelf: Fragrance[] }) {
  const rows = [shelf.slice(0, 5), shelf.slice(5, 10)];
  return (
    <figure aria-label="A shelf of real fragrances from the catalog" className="relative self-center">
      <div className="rounded-md border border-foreground/15 bg-card/80 px-6 pt-8 pb-4 shadow-[0_30px_60px_-40px_oklch(0.2_0.02_50/0.5)]">
        {rows.map((row, r) => (
          <div key={r} className={r ? "mt-10" : ""}>
            <div className="shelf flex items-end justify-around gap-2 px-1">
              {row.map((f) => (
                <ScentSwatch key={f.id} name={f.name} accords={f.accords} size="md" className="-mb-px" />
              ))}
            </div>
            <div className="mt-2 flex justify-around gap-2">
              {row.map((f) => (
                <span key={f.id} className="w-[4.5rem] truncate text-center font-mono text-[9px] tracking-wide text-muted-foreground uppercase" title={`${f.brand} ${f.name}`}>
                  {f.name}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="absolute -right-2 -bottom-6 w-52 rotate-[2.5deg] rounded-sm border border-foreground/15 bg-[oklch(0.975_0.02_90)] p-3.5 shadow-md sm:-right-6">
        <p className="label !text-primary">Shelf note</p>
        <p className="mt-1 font-heading text-lg leading-snug">Nothing here for a summer evening.</p>
        <p className="mt-1 text-xs text-muted-foreground">Fill gaps would start there.</p>
      </div>
      <figcaption className="mt-10 text-center text-xs text-muted-foreground">The ten most-voted fragrances in the catalog, one per family.</figcaption>
    </figure>
  );
}

function Problem({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <li className="relative">
      <span className="absolute top-1 -left-[2.65rem] flex size-5 items-center justify-center rounded-full bg-background font-mono text-[10px] text-primary ring-1 ring-foreground/20">{n.slice(1)}</span>
      <h3 className="text-2xl">{title}</h3>
      <p className="mt-2 leading-relaxed text-muted-foreground">{children}</p>
    </li>
  );
}

function Mark({ v }: { v: "yes" | "no" | "partly" }) {
  if (v === "yes") return <Check className="mx-auto size-5 text-success" aria-label="Yes" />;
  if (v === "partly") return <Minus className="mx-auto size-5 text-warning" aria-label="Partly" />;
  return <X className="mx-auto size-4 text-muted-foreground/60" aria-label="No" />;
}

function Act({ n, title, body, children, flip = false }: { n: string; title: string; body: string; children: React.ReactNode; flip?: boolean }) {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-2">
      <div className={flip ? "lg:order-2" : ""}>
        <p className="font-heading text-6xl text-primary/80 italic">{n}</p>
        <h3 className="mt-2 text-4xl">{title}</h3>
        <p className="mt-4 max-w-md leading-relaxed text-muted-foreground">{body}</p>
      </div>
      <div className={flip ? "lg:order-1" : ""}>{children}</div>
    </div>
  );
}

/** Static fragments built from the app's real components and data shapes, labelled as examples. */
function CoverageSample() {
  const rows: [string, number[]][] = [
    ["Day", [4, 4, 2, 2]],
    ["Evening", [2, 2, 4, 4]],
  ];
  return (
    <figure className="rounded-md border bg-card p-6">
      <div className="flex items-baseline justify-between">
        <p className="font-heading text-2xl">When you can wear them</p>
        <span className="label">Sample shelf</span>
      </div>
      <table className="mt-4 w-full table-fixed border-separate border-spacing-1.5 text-sm">
        <thead>
          <tr>
            <th />
            {["Spring", "Summer", "Fall", "Winter"].map((s) => (
              <th key={s} className="label text-left !font-normal">
                {s}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([d, cells]) => (
            <tr key={d}>
              <th scope="row" className="label text-left !font-normal">
                {d}
              </th>
              {cells.map((c, i) => (
                <td key={i} className="h-11 rounded-sm text-center font-mono tabular-nums" style={{ background: `color-mix(in oklch, var(--primary) ${c * 18}%, var(--card))`, color: c >= 4 ? "var(--primary-foreground)" : undefined }}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <figcaption className="mt-3 text-xs text-muted-foreground">Bottles suited to each season and time of day, from community votes.</figcaption>
    </figure>
  );
}

function PickSample() {
  return (
    <figure className="rounded-md border bg-card p-6">
      <div className="flex items-start gap-5">
        <span className="font-heading text-5xl text-muted-foreground/60 italic">1</span>
        <ScentSwatch name="Aromatics Elixir" accords={[{ name: "aromatic", strength: 100 }, { name: "woody", strength: 80 }, { name: "earthy", strength: 60 }]} size="md" />
        <div className="min-w-0 flex-1">
          <p className="label">Clinique · {FAMILY_LABEL.chypre}</p>
          <p className="font-heading text-2xl">Aromatics Elixir</p>
          <ul className="mt-3 grid gap-1 text-sm">
            <li>— Adds chypre (you own 0)</li>
            <li>— Community votes favour it for winter</li>
            <li className="text-muted-foreground">— Reviewers call it polarizing</li>
          </ul>
        </div>
        <div className="text-right">
          <p className="font-heading text-3xl">78%</p>
          <p className="label">est. fit</p>
        </div>
      </div>
      <figcaption className="mt-4 border-t pt-3 text-xs text-muted-foreground">An example pick for the sample shelf, with the engine&apos;s own reasons.</figcaption>
    </figure>
  );
}

function OfferSample() {
  const rows: [string, string, boolean][] = [
    ["Eau de Parfum, 100 ml", "Exact match", true],
    ["Eau de Parfum, 100 ml", "Exact match", true],
    ["Eau de Toilette, 100 ml", "Different concentration", false],
    ["Eau de Parfum, 100 ml, tester", "Tester", false],
    ["Intense Eau de Parfum, 100 ml", "Flanker", false],
  ];
  return (
    <figure className="rounded-md border bg-card p-6">
      <div className="flex items-baseline justify-between">
        <p className="font-heading text-2xl">Looking for: EDP, 100 ml</p>
        <span className="label">Sample stores</span>
      </div>
      <ul className="mt-4 divide-y text-sm">
        {rows.map(([t, s, ok], i) => (
          <li key={i} className={`flex items-center justify-between gap-3 py-2.5 ${ok ? "" : "text-muted-foreground"}`}>
            <span className={ok ? "" : "line-through decoration-foreground/30"}>{t}</span>
            <span className={`label ${ok ? "!text-success" : ""}`}>{s}</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}

function Perm({ title, items, note }: { title: string; items: string[]; note?: string }) {
  return (
    <div className="bg-ink p-4">
      <dt className="font-mono text-[11px] tracking-[0.08em] text-[oklch(0.78_0.1_55)] uppercase">{title}</dt>
      <dd className="mt-2">
        <ul className="grid gap-1 text-ink-foreground/80">
          {items.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
        {note && <p className="mt-2 text-xs text-ink-foreground/65">{note}</p>}
      </dd>
    </div>
  );
}

function Proof({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dd className="font-heading text-5xl leading-none tabular-nums">{value}</dd>
      <dt className="mt-2 text-sm leading-snug text-muted-foreground">{label}</dt>
    </div>
  );
}
