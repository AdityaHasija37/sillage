"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ScentSwatch } from "@/components/fragrance/scent-swatch";
import type { PairPrediction } from "@/lib/intelligence/lab";
import type { Experiment } from "@/lib/intelligence/service";
import { cn } from "@/lib/utils";

type Owned = { id: string; brand: string; name: string; accords: { name: string; strength: number }[] };
type Ok = Extract<PairPrediction, { status: "ok" }>;

export function ScentLab({ owned, initialExperiments }: { owned: Owned[]; initialExperiments: Experiment[] }) {
  const [a, setA] = useState<string | null>(null);
  const [b, setB] = useState<string | null>(null);
  const [pred, setPred] = useState<PairPrediction | { status: "error"; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<"a_first" | "b_first" | "together">("a_first");
  const [showRatio, setShowRatio] = useState(true);
  const [experiments, setExperiments] = useState(initialExperiments);
  const req = useRef(0);
  const byId = new Map(owned.map((o) => [o.id, o]));

  useEffect(() => {
    if (!a || !b) return;
    const id = ++req.current;
    (async () => {
      setLoading(true);
      try {
        const r = await fetch("/api/scent-lab/predict", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fragranceAId: a, fragranceBId: b }) });
        const body = await r.json();
        if (id === req.current) setPred(r.ok ? body : { status: "error", message: body.message });
      } catch {
        if (id === req.current) setPred({ status: "error", message: "Couldn't reach Sillage." });
      } finally {
        if (id === req.current) setLoading(false);
      }
    })();
  }, [a, b]);

  const refresh = async () => {
    const r = await fetch("/api/scent-lab/experiments");
    if (r.ok) setExperiments(await r.json());
  };

  const save = async () => {
    if (!a || !b) return;
    const r = await fetch("/api/scent-lab/experiments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fragranceAId: a, fragranceBId: b, applicationOrder: order }) });
    const body = await r.json();
    if (!r.ok) return toast.error(body.message);
    toast.success("Saved to your lab notebook");
    await refresh();
  };

  if (owned.length < 2) {
    return (
      <div className="rounded-md border border-dashed p-10 text-center">
        <p className="font-heading text-2xl">You need two bottles to layer</p>
        <p className="mt-2 text-sm text-muted-foreground">Scent Lab only pairs fragrances you own.</p>
      </div>
    );
  }

  const ok = pred && pred.status === "ok" ? (pred as Ok) : null;
  const A = a ? byId.get(a) : null;
  const B = b ? byId.get(b) : null;

  return (
    <div className="grid gap-14">
      {/* The bench */}
      <section aria-label="Choose two bottles" className="grain rounded-md border bg-card px-4 py-8 sm:px-8">
        <div className="grid items-end gap-6 sm:grid-cols-[1fr_auto_1fr_auto_1fr]">
          <Slot label="Bottle A" value={a} other={b} owned={owned} onChange={setA} />
          <Plus className="mx-auto mb-16 hidden size-6 text-muted-foreground sm:block" aria-hidden="true" />
          <Slot label="Bottle B" value={b} other={a} owned={owned} onChange={setB} />
          <span className="mx-auto mb-16 hidden font-heading text-3xl text-muted-foreground sm:block" aria-hidden="true">
            =
          </span>
          <div className="grid justify-items-center gap-2 text-center">
            <p className="label">Predicted blend</p>
            <div className={cn("flex h-60 items-end transition-opacity", !ok && "opacity-30")}>
              <ScentSwatch name={ok ? ok.pairKey : "blend"} accords={ok ? ok.dominantAccordHypotheses.map((d) => ({ name: d.tag, strength: d.share })) : [{ name: "musky", strength: 50 }]} size="xl" />
            </div>
            <p className="font-heading text-3xl tabular-nums">{loading ? "…" : ok ? ok.score : "–"}</p>
            <p className="label">compatibility (experimental)</p>
          </div>
        </div>
        <div className="shelf mt-2" aria-hidden="true" />
      </section>

      <div aria-live="polite">
        {pred && pred.status === "error" && (
          <p role="alert" className="border-l-2 border-destructive pl-3 text-sm text-destructive">
            {pred.message}
          </p>
        )}
        {pred && (pred.status === "insufficient" || pred.status === "invalid") && (
          <div className="rounded-md border border-dashed p-6">
            <p className="font-heading text-2xl">Not enough to go on</p>
            <p className="mt-2 text-sm text-muted-foreground">{pred.message}</p>
          </div>
        )}
        {ok && A && B && (
          <section aria-label="Prediction" className="grid gap-10 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <p className="label">Prediction · {ok.confidence} confidence</p>
              <p className="mt-2 font-heading text-3xl leading-snug">{ok.character}</p>
              <div className="mt-6">
                <p className="label mb-2">Predicted dominant accords</p>
                <div className="flex h-3 overflow-hidden rounded-full" aria-hidden="true">
                  {ok.dominantAccordHypotheses.map((d, i) => (
                    <span key={d.tag} style={{ flexGrow: d.share }} className={cn(i === 0 ? "bg-primary" : i === 1 ? "bg-primary/60" : "bg-primary/30")} />
                  ))}
                </div>
                <p className="mt-1.5 text-sm">{ok.dominantAccordHypotheses.map((d) => `${d.tag} ${d.share}%`).join(" · ")}</p>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="label !text-success">Why it might work</p>
                  <ul className="mt-2 grid gap-1 text-sm">{ok.complementFactors.length ? ok.complementFactors.map((f) => <li key={f}>{f}</li>) : <li className="text-muted-foreground">No classic complement found</li>}</ul>
                </div>
                <div>
                  <p className="label !text-warning">Watch out for</p>
                  <ul className="mt-2 grid gap-1 text-sm">{ok.cautionFactors.length ? ok.cautionFactors.map((f) => <li key={f}>{f}</li>) : <li className="text-muted-foreground">No known tension</li>}</ul>
                </div>
              </div>
              <p className="mt-6 text-sm">
                <span className="label mr-2">Predicted intensity</span>
                {ok.predictedIntensity ?? "unknown"}
                {ok.occasionFit.length > 0 && (
                  <>
                    <span className="label mr-2 ml-6">Best for</span>
                    {ok.occasionFit.map((o) => o.label.toLowerCase()).join(", ")}
                  </>
                )}
              </p>
            </div>
            <div className="grid content-start gap-6">
              <dl className="grid gap-2.5 rounded-md border bg-card p-5">
                {ok.components.map((c) => (
                  <div key={c.key} className="grid grid-cols-[1fr_6rem_2.5rem] items-center gap-3 text-sm">
                    <dt>{c.label}</dt>
                    <dd className="h-1.5 rounded-full bg-muted" aria-hidden="true">
                      {c.value != null && <span className="block h-full rounded-full bg-primary" style={{ width: `${c.value}%` }} />}
                    </dd>
                    <dd className="text-right font-mono tabular-nums">{c.value ?? "n/a"}</dd>
                  </div>
                ))}
              </dl>
              <div className="-mt-4 grid gap-1 px-1">
                {ok.personalization !== 0 && <p className="text-xs text-muted-foreground">Based on your past feedback: {ok.personalization > 0 ? "+" : ""}{ok.personalization} points.</p>}
                <p className="text-[11px] text-muted-foreground">{ok.provenance} · {ok.algorithmVersion}</p>
              </div>
              <div className="rounded-md border bg-card p-5">
                <div className="flex items-center justify-between">
                  <p className="label">Try it</p>
                  <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <input type="checkbox" checked={showRatio} onChange={(e) => setShowRatio(e.target.checked)} className="size-3.5 accent-[var(--primary)]" /> Show a starting suggestion
                  </label>
                </div>
                {showRatio && <p className="mt-2 text-sm">{ok.suggestedStartingApplication.text}</p>}
                <p className="mt-2 text-xs text-muted-foreground">Patch-test if your skin is sensitive, and go lighter than you think: two scents add up.</p>
                <fieldset className="mt-4">
                  <legend className="label mb-2">Application order to save</legend>
                  <div className="flex flex-wrap gap-1.5" role="radiogroup">
                    {([["a_first", `${A.name} first`], ["b_first", `${B.name} first`], ["together", "Side by side"]] as const).map(([v, l]) => (
                      <button key={v} type="button" role="radio" aria-checked={order === v} onClick={() => setOrder(v)} className={cn("rounded-full border px-3 py-1 text-xs", order === v ? "border-ink bg-ink text-ink-foreground" : "border-foreground/20")}>
                        {l}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <button type="button" onClick={save} className="mt-4 inline-flex h-10 items-center rounded-full bg-ink px-5 text-sm text-ink-foreground">
                  Save to lab notebook
                </button>
              </div>
            </div>
          </section>
        )}
        {!pred && <p className="text-sm text-muted-foreground">Choose two of your bottles to see a predicted pairing. It&apos;s a heuristic from accords and community data, not chemistry: the real test is wearing it.</p>}
      </div>

      <Notebook experiments={experiments} byId={byId} onChange={refresh} />
    </div>
  );
}

function Slot({ label, value, other, owned, onChange }: { label: string; value: string | null; other: string | null; owned: Owned[]; onChange: (id: string | null) => void }) {
  const chosen = owned.find((o) => o.id === value);
  return (
    <div className="grid justify-items-center gap-3">
      <div className="flex h-60 items-end">{chosen ? <ScentSwatch name={chosen.name} accords={chosen.accords} size="xl" /> : <div className="flex h-56 w-40 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">{label}</div>}</div>
      <label className="sr-only" htmlFor={`slot-${label}`}>
        {label}
      </label>
      <select id={`slot-${label}`} value={value ?? ""} onChange={(e) => onChange(e.target.value || null)} className="h-10 w-full max-w-56 rounded-full border border-foreground/25 bg-background px-4 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
        <option value="">Choose {label.toLowerCase()}…</option>
        {owned.map((o) => (
          <option key={o.id} value={o.id} disabled={o.id === other}>
            {o.brand} {o.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function Notebook({ experiments, byId, onChange }: { experiments: Experiment[]; byId: Map<string, Owned>; onChange: () => void }) {
  return (
    <section aria-labelledby="notebook-h">
      <div className="flex items-baseline justify-between border-b pb-2">
        <h2 id="notebook-h" className="text-3xl">
          Lab notebook
        </h2>
        <span className="label">{experiments.length} saved</span>
      </div>
      {experiments.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Saved pairings appear here. After you wear one, log how it went: your predictions and results stay side by side.</p>
      ) : (
        <ul className="divide-y">
          {experiments.map((e) => (
            <ExperimentRow key={e.id} e={e} accordsA={byId.get(e.a.id)?.accords ?? e.a.accords} accordsB={byId.get(e.b.id)?.accords ?? e.b.accords} onChange={onChange} />
          ))}
        </ul>
      )}
    </section>
  );
}

function ExperimentRow({ e, accordsA, accordsB, onChange }: { e: Experiment; accordsA: Owned["accords"]; accordsB: Owned["accords"]; onChange: () => void }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [intensity, setIntensity] = useState<"soft" | "moderate" | "strong" | null>(null);
  const [repeat, setRepeat] = useState<boolean | null>(null);
  const [notes, setNotes] = useState("");
  const avg = e.feedback.length ? e.feedback.reduce((s, f) => s + f.rating, 0) / e.feedback.length : null;
  const first = e.applicationOrder === "b_first" ? e.b.name : e.a.name;

  const submit = async () => {
    const r = await fetch(`/api/scent-lab/experiments/${e.id}/feedback`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rating, intensity, repeat, notes: notes || null }) });
    const body = await r.json();
    if (!r.ok) return toast.error(body.message);
    toast.success("Logged. Future predictions for similar pairs will take it into account.");
    setOpen(false);
    onChange();
  };
  const remove = async () => {
    const r = await fetch(`/api/scent-lab/experiments/${e.id}`, { method: "DELETE" });
    if (r.ok) onChange();
    else toast.error("Couldn't delete it.");
  };

  return (
    <li className="grid gap-4 py-5 sm:grid-cols-[auto_1fr_auto]">
      <div className="flex items-end gap-1">
        <ScentSwatch name={e.a.name} accords={accordsA} size="sm" />
        <ScentSwatch name={e.b.name} accords={accordsB} size="sm" />
      </div>
      <div className="min-w-0">
        <p className="font-heading text-2xl leading-tight">
          {e.a.name} <span className="text-muted-foreground">+</span> {e.b.name}
        </p>
        <p className="text-xs text-muted-foreground">
          {e.applicationOrder === "together" ? "Side by side" : `${first} first`} · saved {new Date(e.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </p>
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <span>
            <span className="label mr-1.5">Predicted</span>
            <span className="font-mono">{e.prediction.score}</span>
            <span className="text-muted-foreground"> / 100</span>
          </span>
          <span>
            <span className="label mr-1.5">You rated</span>
            {avg == null ? <span className="text-muted-foreground">not worn yet</span> : <span className="font-mono">{avg.toFixed(1)} / 5</span>}
            {e.feedback.length > 1 && <span className="text-muted-foreground"> ({e.feedback.length} wears)</span>}
          </span>
        </div>
        {e.feedback[0]?.notes && <p className="mt-1 text-sm text-muted-foreground italic">“{e.feedback[0].notes}”</p>}
        {open && (
          <div className="mt-4 grid gap-3 rounded-md border bg-card p-4">
            <fieldset>
              <legend className="label mb-1">How did it go?</legend>
              <div className="flex gap-1" role="radiogroup">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} of 5`} onClick={() => setRating(n)} className="p-1">
                    <Star className={cn("size-6", n <= rating ? "fill-primary text-primary" : "text-muted-foreground")} aria-hidden="true" />
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="flex flex-wrap gap-4 text-sm">
              <fieldset className="flex items-center gap-1.5">
                <legend className="label mr-2 inline">Felt</legend>
                {(["soft", "moderate", "strong"] as const).map((i) => (
                  <button key={i} type="button" aria-pressed={intensity === i} onClick={() => setIntensity(intensity === i ? null : i)} className={cn("rounded-full border px-2.5 py-0.5 text-xs", intensity === i ? "border-ink bg-ink text-ink-foreground" : "border-foreground/20")}>
                    {i}
                  </button>
                ))}
              </fieldset>
              <label className="inline-flex items-center gap-1.5 text-sm">
                <input type="checkbox" checked={repeat === true} onChange={(ev) => setRepeat(ev.target.checked)} className="size-4 accent-[var(--primary)]" /> I&apos;d wear it again
              </label>
            </div>
            <label className="grid gap-1 text-sm">
              <span className="label">Notes (private, optional)</span>
              <textarea value={notes} onChange={(ev) => setNotes(ev.target.value.slice(0, 500))} rows={2} className="rounded-md border bg-background p-2 text-sm" />
            </label>
            <div className="flex gap-2">
              <button type="button" disabled={!rating} onClick={submit} className="inline-flex h-9 items-center rounded-full bg-ink px-4 text-sm text-ink-foreground disabled:opacity-50">
                Log this wear
              </button>
              <button type="button" onClick={() => setOpen(false)} className="h-9 rounded-full px-3 text-sm text-muted-foreground">
                Cancel
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Your result is stored next to the prediction; the prediction itself never changes.</p>
          </div>
        )}
      </div>
      <div className="flex items-start gap-2 sm:flex-col sm:items-end">
        {!open && (
          <button type="button" onClick={() => setOpen(true)} className="inline-flex h-9 items-center rounded-full border border-foreground/25 px-4 text-sm hover:border-foreground">
            Log a wear
          </button>
        )}
        <button type="button" onClick={remove} aria-label={`Delete ${e.a.name} + ${e.b.name}`} className="inline-flex h-9 items-center gap-1 rounded-full px-3 text-xs text-muted-foreground hover:text-destructive">
          <Trash2 className="size-3.5" aria-hidden="true" /> Delete
        </button>
        {e.prediction.cautionFactors.length > 0 && (
          <span className="inline-flex items-center gap-1 text-xs text-warning" title={e.prediction.cautionFactors.join("; ")}>
            <AlertTriangle className="size-3.5" aria-hidden="true" /> caution
          </span>
        )}
      </div>
    </li>
  );
}
