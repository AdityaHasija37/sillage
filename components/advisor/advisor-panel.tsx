"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { Check, ChevronDown, Loader2, Send, ShieldCheck, Wrench } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { confirmAdvisorAction } from "@/app/(app)/app/actions";
import type { AdvisorReply } from "@/lib/agent/advisor";
import type { PendingAction } from "@/lib/agent/tools";
import { cn } from "@/lib/utils";

type Cited = { id: string; brand: string; name: string };
type Turn = { role: "user"; text: string } | { role: "assistant"; reply: AdvisorReply; cited: Cited[] } | { role: "error"; text: string };

const SUGGESTIONS = [
  "Suggest a woody winter fragrance under $100 that isn't close to what I own",
  "What's missing from my collection for summer?",
  "Something like my favourite, but for evenings",
];


export function AdvisorPanel() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [turns, busy]);

  async function ask(message: string) {
    const text = message.trim();
    if (!text || busy) return;
    setInput("");
    setTurns((t) => [...t, { role: "user", text }]);
    setBusy(true);
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId, message: text }) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "The advisor is unavailable right now.");
      setSessionId(body.sessionId);
      setTurns((t) => [...t, { role: "assistant", reply: body as AdvisorReply, cited: body.cited ?? [] }]);
    } catch (e) {
      setTurns((t) => [...t, { role: "error", text: e instanceof Error ? e.message : "Something went wrong." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4" aria-live="polite">
        {turns.length === 0 && (
          <div className="grid gap-3">
            <p className="text-sm text-muted-foreground">Ask about your next bottle. The advisor reads your collection and preferences, then uses the same engine as Discover.</p>
            <ul className="grid gap-2">
              {SUGGESTIONS.map((s) => (
                <li key={s}>
                  <button type="button" onClick={() => ask(s)} className="w-full rounded-lg border bg-card px-3 py-2 text-left text-sm transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        <ol className="grid gap-4">
          {turns.map((t, i) => (
            <li key={i}>
              {t.role === "user" && <p className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-ink px-3.5 py-2 text-sm text-ink-foreground">{t.text}</p>}
              {t.role === "error" && (
                <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {t.text}
                </p>
              )}
              {t.role === "assistant" && <AssistantMessage reply={t.reply} cited={t.cited} />}
            </li>
          ))}
        </ol>
        {busy && (
          <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground" role="status">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Checking your collection and running the engine…
          </p>
        )}
        <div ref={endRef} />
      </div>
      <form
        className="flex items-end gap-2 border-t p-3"
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
      >
        <label htmlFor="advisor-input" className="sr-only">
          Ask the advisor
        </label>
        <Textarea
          id="advisor-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              ask(input);
            }
          }}
          maxLength={600}
          rows={2}
          placeholder="e.g. A fresh office scent under $80"
          className="min-h-11 resize-none"
        />
        <Button type="submit" size="icon-lg" disabled={busy || !input.trim()} aria-label="Send">
          <Send aria-hidden="true" />
        </Button>
      </form>
    </div>
  );
}

function AssistantMessage({ reply, cited }: { reply: AdvisorReply; cited: Cited[] }) {
  const byId = new Map(cited.map((c) => [c.id, c]));
  // Render [[f:id]] citations as links to the fragrance page, labelled with the verified name.
  const parts = reply.text.split(/(\[\[f:[0-9a-f-]{36}\]\])/gi);
  return (
    <div className="grid gap-2">
      <div className="max-w-[95%] rounded-2xl rounded-bl-sm border bg-card px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap">
        {parts.map((p, i) => {
          const m = /^\[\[f:([0-9a-f-]{36})\]\]$/i.exec(p);
          if (!m) return <span key={i}>{p}</span>;
          const c = byId.get(m[1].toLowerCase());
          return c ? (
            <Link key={i} href={`/app/fragrance/${c.id}`} aria-label={`Open ${c.brand} ${c.name}`} className="mx-0.5 inline-flex items-center rounded bg-accent px-1 text-xs font-medium text-accent-foreground hover:underline">
              ↗
            </Link>
          ) : null;
        })}
      </div>
      {cited.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Fragrances mentioned">
          {cited.map((c) => (
            <li key={c.id}>
              <Link href={`/app/fragrance/${c.id}`} className="inline-flex rounded-full border bg-card px-2.5 py-1 text-xs hover:bg-muted">
                <span className="text-muted-foreground">{c.brand}</span>&nbsp;{c.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {reply.pendingActions.map((a, i) => (
        <PendingCard key={i} action={a} />
      ))}
      <Trace reply={reply} />
    </div>
  );
}

function PendingCard({ action }: { action: PendingAction }) {
  const [state, setState] = useState<"idle" | "done" | "dismissed">("idle");
  const [pending, start] = useTransition();
  if (state === "dismissed") return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/30 bg-accent/60 px-3 py-2 text-sm">
      <span>{action.label}?</span>
      {state === "done" ? (
        <span className="inline-flex items-center gap-1 text-success">
          <Check className="size-4" aria-hidden="true" /> Saved
        </span>
      ) : (
        <span className="flex gap-1.5">
          <Button
            size="sm"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await confirmAdvisorAction(action);
                if (r.ok) setState("done");
                else toast.error(r.error);
              })
            }
          >
            Confirm
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setState("dismissed")}>
            No thanks
          </Button>
        </span>
      )}
    </div>
  );
}

/** "How I got this": the agent's tool calls, model, latency, cost and grounding check. */
function Trace({ reply }: { reply: AdvisorReply }) {
  const [open, setOpen] = useState(false);
  const t = reply.trace;
  const removed = t.grounding.removedIds.length + t.grounding.removedPrices.length;
  return (
    <div className="text-xs text-muted-foreground">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="inline-flex items-center gap-1 rounded px-1 py-0.5 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
        <Wrench className="size-3.5" aria-hidden="true" />
        How I got this · {t.steps.length} tool call{t.steps.length === 1 ? "" : "s"}
        <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>
      {open && (
        <div className="mt-2 grid gap-2 rounded-lg border bg-muted/40 p-3">
          <p>
            {t.mode === "ai" ? (
              <>
                Model <span className="font-mono">{t.model}</span> · {t.rounds} round{t.rounds === 1 ? "" : "s"} · {(t.latencyMs / 1000).toFixed(1)}s
                {t.usage && ` · ${t.usage.inputTokens + t.usage.cacheReadTokens} in / ${t.usage.outputTokens} out tokens`}
                {t.costUsd != null && ` · ~$${t.costUsd.toFixed(4)}`}
              </>
            ) : (
              <>Offline rule-based mode ({t.offlineReason === "no_api_key" ? "no AI model configured" : "AI unavailable"}) · {(t.latencyMs / 1000).toFixed(1)}s · $0</>
            )}
          </p>
          <ol className="grid gap-1">
            {t.steps.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="tabular-nums">{i + 1}.</span>
                <span className={s.ok ? "" : "text-destructive"}>
                  <span className="font-mono">{s.tool}</span> · {s.summary} <span className="opacity-70">({s.ms} ms)</span>
                </span>
              </li>
            ))}
          </ol>
          <p className="flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 text-success" aria-hidden="true" />
            Grounding check: {t.grounding.citedIds.length} fragrance{t.grounding.citedIds.length === 1 ? "" : "s"} cited, all returned by a tool.
            {removed > 0 && ` Removed ${removed} unverified item${removed === 1 ? "" : "s"}.`}
          </p>
        </div>
      )}
    </div>
  );
}
