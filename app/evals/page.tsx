import type { Metadata } from "next";
import { CheckCircle2, XCircle } from "lucide-react";
import { SiteFooter, SiteHeader, GITHUB_URL } from "@/components/marketing/site-header";
import latest from "@/docs/evals/latest.json";
import history from "@/docs/evals/history.json";

export const metadata: Metadata = {
  title: "Evals",
  description: "How Sillage measures recommendation relevance, offer-matching precision and AI grounding, with every case and result.",
};

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const REASON: Record<string, string> = {
  unrecognised_words: "extra words (possible flanker)",
  different_edition: "different edition",
  concentration_mismatch: "different concentration",
  size_mismatch: "different size",
};

export default function EvalsPage() {
  const r = latest;
  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main className="mx-auto grid max-w-5xl gap-14 px-4 pt-6 pb-24 sm:px-6">
        <header>
          <p className="text-sm font-medium tracking-wide text-primary uppercase">Evaluation</p>
          <h1 className="mt-3 text-5xl font-medium tracking-tight">How well does it work?</h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Every number here comes from the project&apos;s own eval suite (<code className="font-mono text-base">npm run evals</code>). Cases and pass criteria were written before the first run. These are synthetic tests, not user research: they show the system does what it claims, not that people love it.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Last run {new Date(r.generatedAt).toUTCString()} · engine {r.engineVersion}
          </p>
        </header>

        <section aria-labelledby="summary-h" className="grid gap-4">
          <h2 id="summary-h" className="sr-only">
            Summary
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Tile label="Offer matching precision" value={pct(r.offers.precision)} hint={`"Exact" matches that really were the same bottle, over ${r.offers.pairs} adversarial listings. Recall ${pct(r.offers.recall)}.`} />
            <Tile label="Recommendation personas passing" value={`${r.recommendations.passed}/${r.recommendations.total}`} hint={`Relevance checks ${pct(r.recommendations.relevance)}; hard exclusions ${pct(r.recommendations.exclusionCompliance)}.`} />
            <Tile label="Fake ids or prices reaching users" value={`${r.grounding.fabricated} / ${r.grounding.injected}`} hint="Planted in adversarial model outputs; the grounding check must remove all of them." />
            <Tile label="Common bottles found by name" value={pct(r.catalog.coverage)} hint={`${r.catalog.fragrances.toLocaleString("en-US")} fragrances; median search ${r.catalog.medianSearchMs} ms (local).`} />
          </div>
        </section>

        <section aria-labelledby="iter-h">
          <h2 id="iter-h" className="text-3xl font-medium tracking-tight">
            What the evals changed
          </h2>
          <p className="mt-2 max-w-3xl text-muted-foreground">The first run found real problems. Each fix was a product decision, logged in the decision register, and the cases themselves were not edited to pass.</p>
          <div className="mt-6 overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-normal">Run</th>
                  <th className="px-3 py-2 font-normal">Engine</th>
                  <th className="px-3 py-2 text-right font-normal">Offer precision</th>
                  <th className="px-3 py-2 text-right font-normal">Personas passing</th>
                  <th className="px-3 py-2 text-right font-normal">Relevance checks</th>
                  <th className="px-3 py-2 text-right font-normal">Fabrications</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.file} className="border-t">
                    <td className="px-3 py-2 font-mono text-xs">{h.label}</td>
                    <td className="px-3 py-2">{h.engineVersion}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{pct(h.offerPrecision)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {h.recPassed}/{h.recTotal}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{pct(h.relevance)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{h.fabricated}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="mt-6 grid gap-3 text-sm leading-relaxed md:grid-cols-3">
            <li className="rounded-md border bg-card p-4">
              <p className="font-medium">Blocklists don&apos;t catch flankers</p>
              <p className="mt-1 text-muted-foreground">v1 matched “Khamrah Qahwa” and “1 Million Lucky” as exact. v2 only trusts words it recognises; anything else goes to “Needs verification”.</p>
            </li>
            <li className="rounded-md border bg-card p-4">
              <p className="font-medium">Similar meant “buy a flanker”</p>
              <p className="mt-1 text-muted-foreground">A La Vie Est Belle fan got two La Vie Est Belle flankers. v2 flags other versions of owned lines and down-weights them, the PRD&apos;s “avoid a redundant purchase”.</p>
            </li>
            <li className="rounded-md border bg-card p-4">
              <p className="font-medium">Different stayed in the same family</p>
              <p className="mt-1 text-muted-foreground">An all-amber shelf got another amber. v2 rewards a new family and gives Gap mode its own weights, so filling the gap outweighs matching current taste.</p>
            </li>
          </ul>
        </section>

        <section aria-labelledby="rec-h">
          <h2 id="rec-h" className="text-3xl font-medium tracking-tight">
            Recommendations: {r.recommendations.total} synthetic personas
          </h2>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Every case runs hard checks (nothing owned, no disliked notes, budget and marketing respected) plus persona-specific relevance checks: closeness to the loved bottle for Similar, low overlap and a new family for Different, a named gap for Fill gaps, and an honest “no clear gap” for balanced or tiny shelves. Median {r.recommendations.medianMs} ms over {r.recommendations.poolSize.toLocaleString("en-US")} candidates.
          </p>
          <div className="mt-6 overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-normal">Case</th>
                  <th className="px-3 py-2 font-normal">Persona</th>
                  <th className="px-3 py-2 font-normal">Checks</th>
                  <th className="px-3 py-2 font-normal">Top 3</th>
                </tr>
              </thead>
              <tbody>
                {r.recommendations.cases.map((c) => (
                  <tr key={c.id} className="border-t align-top">
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1.5 font-mono text-xs">
                        {c.passed ? <CheckCircle2 className="size-4 text-success" aria-label="Pass" /> : <XCircle className="size-4 text-destructive" aria-label="Fail" />}
                        {c.id}
                      </span>
                    </td>
                    <td className="px-3 py-2">{c.persona}</td>
                    <td className="px-3 py-2 text-xs">
                      <ul className="grid gap-0.5">
                        {c.checks.map((ch) => (
                          <li key={ch.name} className={ch.ok ? "text-muted-foreground" : "font-medium text-destructive"}>
                            {ch.ok ? "✓" : "✗"} {ch.name}
                            {"detail" in ch && ch.detail ? ` (${ch.detail})` : ""}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{c.top.slice(0, 3).map((t) => t.name).join(" · ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Open question from the failures:</span> for two personas the engine prefers close alternatives from smaller houses (a Tobacco Vanille-style blend from Maison Alhambra) over the famous names I annotated. That may be exactly what a value-minded user wants, or it may hurt trust. It&apos;s a product call to test with users, not something to tune away.
          </p>
        </section>

        <section aria-labelledby="offers-h" className="grid gap-4">
          <h2 id="offers-h" className="text-3xl font-medium tracking-tight">
            Offer matching: {r.offers.pairs} adversarial listings
          </h2>
          <p className="max-w-3xl text-muted-foreground">
            Hand-written listing titles for 12 bottles, each annotated before running: the right bottle phrased different ways (ounces vs ml, brand abbreviations), and wrong ones that look right (EDT for EDP, 50 ml for 100, flankers, testers, gift sets, refills, decants, pre-owned). Precision matters most: a wrong “exact” match is worse than a missing one.
          </p>
          {r.offers.disagreements.length > 0 && (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <caption className="px-3 py-2 text-left text-xs text-muted-foreground">Listings where the matcher disagreed with the annotation</caption>
                <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-normal">Listing</th>
                    <th className="px-3 py-2 font-normal">Annotated</th>
                    <th className="px-3 py-2 font-normal">Matcher</th>
                    <th className="px-3 py-2 font-normal">Why</th>
                  </tr>
                </thead>
                <tbody>
                  {r.offers.disagreements.map((d) => (
                    <tr key={d.title} className="border-t">
                      <td className="px-3 py-2">{d.title}</td>
                      <td className="px-3 py-2">{d.expected}</td>
                      <td className="px-3 py-2">{d.actual === "probable" ? "needs verification" : d.actual}</td>
                      <td className="px-3 py-2 text-muted-foreground">{d.reasons.map((x) => REASON[x] ?? x).join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-sm text-muted-foreground">These remaining disagreements fail safe: the listing is shown under “Needs verification” with the reason, never ranked as a match.</p>
        </section>

        <section aria-labelledby="ground-h" className="grid gap-4">
          <h2 id="ground-h" className="text-3xl font-medium tracking-tight">
            Grounding: can the advisor slip in something false?
          </h2>
          <p className="max-w-3xl text-muted-foreground">
            The agent loop is driven with scripted model outputs that cite invented fragrance ids, real fragrances the tools never returned, and made-up prices. The output contract requires every cited fragrance to come from a tool result in that turn and every dollar amount to appear in a tool result.
          </p>
          <ul className="grid gap-2 text-sm sm:grid-cols-2">
            {r.grounding.scenarios.map((s) => (
              <li key={s.attack} className="flex items-start gap-2 rounded-lg border bg-card px-3 py-2">
                {s.survived === 0 ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-label="Blocked" /> : <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-label="Leaked" />}
                <span>
                  {s.attack}: {s.planted} planted, {s.survived} reached the user; {s.keptValid} valid citation{s.keptValid === 1 ? "" : "s"} kept.
                </span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">
            Live agent eval (real model, real prompts, cost and latency): {r.live.ran ? "see report" : `not run in this report: ${r.live.reason}.`}
          </p>
        </section>

        <section aria-labelledby="intel-h" className="grid gap-4">
          <h2 id="intel-h" className="text-3xl font-medium tracking-tight">
            Collection Intelligence: {r.intelligence.passed}/{r.intelligence.checks} checks
          </h2>
          <p className="max-w-3xl text-muted-foreground">
            The fixture plan from the Collection Intelligence PRD, run on real catalog data: an empty shelf, one bottle, the mixed demo shelf, twenty near-identical fresh bottles, and a shelf with all season and occasion data stripped. Plus the Today selector across 15 occasion and weather combinations, and every Scent Lab pairing of the demo shelf.
          </p>
          <ul className="grid gap-2 text-sm sm:grid-cols-2">
            {r.intelligence.cases.map((c) => (
              <li key={c.id} className="flex items-start gap-2 rounded-md border bg-card px-3 py-2">
                {c.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-label="Pass" /> : <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-label="Fail" />}
                <span>
                  <span className="font-mono text-xs text-muted-foreground">{c.id}</span> {c.name}
                  {"detail" in c && c.detail ? <span className="text-muted-foreground"> ({c.detail})</span> : null}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border bg-accent/40 p-6 text-sm leading-relaxed">
          <h2 className="font-heading text-xl">Limits of these evals</h2>
          <ul className="mt-2 grid list-disc gap-1 pl-5 text-muted-foreground">
            <li>Personas and annotations are mine, not real users&apos;. They test behaviour against the spec, not taste.</li>
            <li>Offer titles are synthetic. Real listings are messier; live precision needs a sample of real SerpApi results, labelled.</li>
            <li>Notes, accords and season votes are community data and can be wrong; the evals inherit that.</li>
          </ul>
          <p className="mt-3">
            Full raw output: <a className="underline underline-offset-2" href={`${GITHUB_URL}/blob/main/docs/evals/REPORT.md`}>docs/evals/REPORT.md</a>
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function Tile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-md border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-heading text-3xl font-medium tabular-nums">{value}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{hint}</p>
    </div>
  );
}
