"use client";

import { useEffect, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

type Step = {
  kind: "ask" | "think" | "tool" | "check" | "answer";
  title: string;
  detail?: string;
  input?: string;
  output?: string;
};

// A worked example in the exact shape the advisor produces. The picks are what the engine returned
// for the demo shelf (Bleu de Chanel, Tobacco Vanille, Sauvage, Jazz Club, Wood Sage & Sea Salt, ADG).
const STEPS: Step[] = [
  { kind: "ask", title: "“A woody winter scent under $150 that isn't like anything I own?”" },
  {
    kind: "think",
    title: "Plan",
    detail: "Personal request, so start from the shelf. “Isn't like anything I own” means Different mode, with a winter filter and a $150 budget.",
  },
  {
    kind: "tool",
    title: "get_user_profile",
    input: "{}",
    output: "6 bottles · 2 loved, 3 liked, 1 neutral · avoids oud · budget $150 · thin on chypre, floral, gourmand",
  },
  {
    kind: "tool",
    title: "recommend_candidates",
    input: '{ "mode": "different", "season": "winter", "budget_max_usd": 150 }',
    output: "3,018 considered · 7 owned, 192 with oud, 530 over budget excluded · top: Rasasi Hawas Elixir, Gisada Ambassador Intense, Clinique Aromatics Elixir",
  },
  {
    kind: "tool",
    title: "get_fragrance_details",
    input: '{ "fragrance_id": "…Aromatics Elixir" }',
    output: "chypre · aromatic, woody, earthy · base: oakmoss, patchouli, incense · longevity 4.2/5 · winter 36% of season votes · est. $50–100 · con: “polarizing fragrance”",
  },
  {
    kind: "check",
    title: "Grounding check",
    detail: "3 fragrances cited, all returned by a tool this turn. Prices mentioned ($50–100), found in the tool results. Nothing removed.",
  },
  {
    kind: "answer",
    title: "Answer, with every pick linked",
    detail:
      "Clinique Aromatics Elixir is the boldest move away from your fresh bottles: an earthy oakmoss-and-patchouli chypre that wearers favour for colder months (estimated $50–100). Heads up, reviewers call it polarizing. Gisada Ambassador Intense keeps a warm amber thread you already like. Rasasi Hawas Elixir is the budget pick; its price band is an estimate, not a quote.",
  },
];

const KIND_LABEL: Record<Step["kind"], string> = { ask: "You", think: "Agent", tool: "Tool call", check: "Guardrail", answer: "Agent" };

export function AgentWalkthrough() {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    // Respect reduced motion: no autoplay, the reader steps through manually.
    const raf = requestAnimationFrame(() => {
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) setPlaying(true);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (!playing || i >= STEPS.length - 1) return;
    const t = setTimeout(() => {
      setI(i + 1);
      if (i + 1 >= STEPS.length - 1) setPlaying(false);
    }, i === 0 ? 1400 : 2100);
    return () => clearTimeout(t);
  }, [playing, i]);

  return (
    <figure aria-label="Step-by-step example of how the advisor answers" className="grid gap-4">
      <ol className="grid gap-2.5">
        {STEPS.map((s, n) => {
          const visible = n <= i;
          return (
            <li
              key={s.title}
              aria-hidden={!visible}
              className={cn(
                "grid grid-cols-[5.5rem_1fr] gap-3 border-l-2 pl-3 transition-all duration-500",
                visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-1 opacity-0",
                s.kind === "tool" && "border-[oklch(0.72_0.11_50)]",
                s.kind === "check" && "border-[oklch(0.72_0.09_130)]",
                (s.kind === "ask" || s.kind === "think" || s.kind === "answer") && "border-white/25",
              )}
            >
              <span className="pt-0.5 font-mono text-[10px] tracking-[0.12em] text-white/65 uppercase">{KIND_LABEL[s.kind]}</span>
              <div className="min-w-0 text-sm leading-relaxed">
                <p className={cn(s.kind === "tool" ? "font-mono text-[13px] text-[oklch(0.85_0.09_60)]" : "text-white", s.kind === "ask" && "font-heading text-xl leading-snug")}>{s.title}</p>
                {s.input && <p className="mt-0.5 truncate font-mono text-[11px] text-white/65">→ {s.input}</p>}
                {s.output && <p className="mt-0.5 font-mono text-[11px] leading-relaxed text-white/70">← {s.output}</p>}
                {s.detail && <p className={cn("mt-0.5 text-white/75", s.kind === "check" && "text-[oklch(0.82_0.08_130)]")}>{s.detail}</p>}
              </div>
            </li>
          );
        })}
      </ol>
      <div className="flex items-center gap-2 border-t border-white/10 pt-3">
        <button
          type="button"
          onClick={() => (i >= STEPS.length - 1 ? (setI(0), setPlaying(true)) : setPlaying((p) => !p))}
          className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/20 px-3 font-mono text-[11px] tracking-wider text-white/85 uppercase hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none"
        >
          {i >= STEPS.length - 1 ? <RotateCcw className="size-3.5" aria-hidden="true" /> : playing ? <Pause className="size-3.5" aria-hidden="true" /> : <Play className="size-3.5" aria-hidden="true" />}
          {i >= STEPS.length - 1 ? "Replay" : playing ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          onClick={() => {
            setPlaying(false);
            setI((n) => Math.min(STEPS.length - 1, n + 1));
          }}
          disabled={i >= STEPS.length - 1}
          className="inline-flex h-8 items-center rounded-full px-3 font-mono text-[11px] tracking-wider text-white/70 uppercase hover:text-white disabled:opacity-40"
        >
          Next step
        </button>
        <span className="ml-auto font-mono text-[11px] text-white/65 tabular-nums" aria-live="polite">
          {i + 1} / {STEPS.length}
        </span>
      </div>
      <figcaption className="text-xs text-white/65">A worked example in the advisor&apos;s real format. In the app, every answer shows its own trace with latency and cost.</figcaption>
    </figure>
  );
}
