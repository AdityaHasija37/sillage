import Link from "next/link";
import { ArrowRight, Info } from "lucide-react";
import { DIMENSION_HELP, SCORE_WEIGHTS, type CollectionScore } from "@/lib/intelligence/score";
import { cn } from "@/lib/utils";

const BAND_COPY: Record<string, string> = {
  emerging: "Emerging",
  developing: "Developing",
  balanced: "Balanced",
  "highly versatile": "Highly versatile",
};

/** F1 Collection Score (PRD 08 §5.1). Coverage descriptors, never a judgement of taste. */
export function ScorePanel({ score, compact = false }: { score: CollectionScore; compact?: boolean }) {
  if (score.status === "empty") {
    return (
      <section aria-labelledby="score-h" className="rounded-md border border-dashed p-6">
        <p className="label">Collection score</p>
        <h2 id="score-h" className="mt-2 text-3xl">
          No score yet
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{score.message}</p>
        <Link href="/app/add" className="mt-4 inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline">
          Add a bottle <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </section>
    );
  }
  return (
    <section aria-labelledby="score-h" className="rounded-md border bg-card">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b p-6">
        <div>
          <p className="label">Collection score</p>
          <h2 id="score-h" className="sr-only">
            Collection score
          </h2>
          <p className="mt-1 flex items-baseline gap-3">
            <span className="font-heading text-7xl leading-none tabular-nums">{score.overallScore}</span>
            <span className="font-heading text-2xl text-primary italic">{BAND_COPY[score.band]}</span>
          </p>
        </div>
        <div className="text-right">
          <p className={cn("label", score.confidence === "low" && "!text-warning")}>{score.confidence} confidence</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {score.collectionSize} bottle{score.collectionSize === 1 ? "" : "s"} · data {Math.round(score.completeness * 100)}% complete
          </p>
        </div>
      </div>
      <dl className="grid gap-3 p-6">
        {score.dimensions.map((d) => (
          <div key={d.key} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 sm:grid-cols-[9.5rem_1fr_3rem]">
            <dt className="flex items-center gap-1.5 text-sm">
              {d.label}
              <span className="group relative">
                <Info className="size-3.5 text-muted-foreground" aria-hidden="true" />
                <span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-64 -translate-x-1/2 rounded-sm bg-ink p-2.5 text-xs leading-relaxed text-ink-foreground group-hover:block">
                  {DIMENSION_HELP[d.key]} Weight {Math.round(SCORE_WEIGHTS[d.key] * 100)}%.
                </span>
              </span>
              <span className="sr-only">: {DIMENSION_HELP[d.key]}</span>
            </dt>
            <dd className="order-3 col-span-2 h-1.5 rounded-full bg-muted sm:order-none sm:col-span-1" aria-hidden="true">
              {d.score != null && <span className="block h-full rounded-full bg-primary" style={{ width: `${d.score}%` }} />}
            </dd>
            <dd className="text-right font-mono text-sm tabular-nums">
              {d.score == null ? <span className="label">n/a</span> : d.score}
              {d.provisional && <span className="sr-only"> (provisional)</span>}
            </dd>
            {!compact && <dd className="col-span-2 text-xs text-muted-foreground sm:col-span-3 sm:col-start-2">{d.provisional ? "Provisional: needs more bottles. " : ""}{d.detail}</dd>}
          </div>
        ))}
      </dl>
      <div className="grid gap-px border-t bg-border sm:grid-cols-2">
        <div className="bg-card p-6">
          <p className="label !text-success">Strengths</p>
          <ul className="mt-2 grid gap-2 text-sm">
            {score.strengths.map((s) => (
              <li key={s.dimension}>
                <span className="font-medium">{s.title}</span>
                <span className="block text-xs text-muted-foreground">{s.detail}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-card p-6">
          <p className="label !text-primary">Gaps</p>
          <ul className="mt-2 grid gap-2 text-sm">
            {score.gaps.map((g) => (
              <li key={g.dimension}>
                <span className="font-medium">{g.title}</span>
                {g.action && (
                  <Link href={g.action.href} className="block text-xs text-primary underline-offset-4 hover:underline">
                    {g.action.label} →
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <details className="border-t px-6 py-4 text-xs text-muted-foreground">
        <summary className="cursor-pointer select-none hover:text-foreground">How this score works</summary>
        <div className="mt-2 grid gap-1.5 leading-relaxed">
          <p>
            Five coverage dimensions, each 0–100, weighted {Object.entries(SCORE_WEIGHTS).map(([, w]) => `${Math.round(w * 100)}%`).join(" / ")}. When data is missing, that dimension is left out and the others are reweighted; it never counts as zero.
          </p>
          <p>A lower score doesn&apos;t mean bad fragrances. It describes how far your shelf reaches across seasons, occasions and styles. Owning more bottles doesn&apos;t raise it by itself, and it&apos;s never compared with other people.</p>
          {score.missingData.length > 0 && <p>Missing: {score.missingData.join("; ")}.</p>}
          <p className="font-mono">Algorithm {score.algorithmVersion}</p>
        </div>
      </details>
    </section>
  );
}
