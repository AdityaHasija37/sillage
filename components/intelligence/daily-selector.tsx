"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Check, CloudRain, Droplets, LocateFixed, Sparkles, ThumbsDown } from "lucide-react";
import { ScentSwatch } from "@/components/fragrance/scent-swatch";
import type { DailyPick, DailyResult } from "@/lib/intelligence/daily";
import { OCCASION_LABEL, OCCASIONS, type Occasion } from "@/lib/intelligence/profile";
import { cn } from "@/lib/utils";

type Owned = { id: string; brand: string; name: string; accords: { name: string; strength: number }[] };
type Ctx = {
  occasion: Occasion;
  daypart: "day" | "night" | null;
  temperature: "cold" | "mild" | "hot" | null;
  humidity: "dry" | "humid" | null;
  sky: "clear" | "rainy" | null;
  weatherSource: "manual" | "api";
  indoors: boolean;
  desiredIntensity: "soft" | "moderate" | "strong" | null;
  mood: "fresh" | "cozy" | "confident" | "romantic" | "calm" | null;
  excluded: string[];
};
type Response = (DailyResult & { requestId: string | null; explanation?: { text: string; source: "ai" | "template" } }) | { code: string; message: string };

const FACTOR_LABEL: Record<string, string> = { occasion: "Occasion", weather: "Weather", intensity: "Intensity", preference: "Your taste", daypart: "Time of day", rotation: "Rotation" };
const REASONS = [
  ["too_strong", "Too strong"],
  ["too_weak", "Too weak"],
  ["poor_context", "Wrong for today"],
  ["dislike_scent", "Don't like it"],
  ["other", "Other"],
] as const;

function Chips<T extends string>({ label, value, options, onChange, allowNone = false }: { label: string; value: T | null; options: readonly (readonly [T, string])[]; onChange: (v: T | null) => void; allowNone?: boolean }) {
  return (
    <fieldset>
      <legend className="label mb-2">{label}</legend>
      <div className="flex flex-wrap gap-1.5" role="radiogroup">
        {options.map(([v, l]) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={value === v}
            onClick={() => onChange(value === v && allowNone ? null : v)}
            className={cn("min-h-9 rounded-full border px-3.5 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none", value === v ? "border-ink bg-ink text-ink-foreground" : "border-foreground/20 hover:border-foreground/60")}
          >
            {l}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function DailySelector({ owned }: { owned: Owned[] }) {
  const [ctx, setCtx] = useState<Ctx>({ occasion: "casual", daypart: new Date().getHours() >= 17 ? "night" : "day", temperature: null, humidity: null, sky: null, weatherSource: "manual", indoors: false, desiredIntensity: null, mood: null, excluded: [] });
  // How many of the tucked-away options are in use (shown on the "More options" summary).
  const moreSet = [ctx.desiredIntensity, ctx.indoors || null, ctx.mood, ctx.excluded.length || null].filter(Boolean).length;
  const [res, setRes] = useState<Response | null>(null);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState<string | null>(null);
  const req = useRef(0);
  const byId = new Map(owned.map((o) => [o.id, o]));

  useEffect(() => {
    const id = ++req.current;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch("/api/intelligence/daily-pick", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            occasion: ctx.occasion,
            daypart: ctx.daypart ?? undefined,
            indoors: ctx.indoors,
            desiredIntensity: ctx.desiredIntensity ?? undefined,
            mood: ctx.mood ?? undefined,
            excludedFragranceIds: ctx.excluded,
            weather: ctx.temperature ? { temperature: ctx.temperature, humidity: ctx.humidity ?? undefined, sky: ctx.sky ?? undefined, source: ctx.weatherSource } : undefined,
          }),
        });
        const body = (await r.json()) as Response;
        if (id === req.current) setRes(body);
      } catch {
        if (id === req.current) setRes({ code: "unavailable", message: "Couldn't reach Sillage. Check your connection and try again." });
      } finally {
        if (id === req.current) setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [ctx]);

  const useLocation = () => {
    if (!("geolocation" in navigator)) return setLocating("Your browser can't share location. Choose the weather below instead.");
    setLocating("Asking for permission…");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const r = await fetch("/api/intelligence/weather", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lat: pos.coords.latitude, lon: pos.coords.longitude }) });
          const w = await r.json();
          if (!r.ok) throw new Error(w.message);
          setCtx((c) => ({ ...c, temperature: w.temperature, humidity: w.humidity, sky: w.sky, weatherSource: "api" }));
          setLocating(`Live: ${w.celsius}°C, ${w.humidity}, ${w.sky}. Location wasn't stored.`);
        } catch (e) {
          setLocating(e instanceof Error ? e.message : "Live weather unavailable. Choose it below.");
        }
      },
      () => setLocating("No problem: choose the weather below instead."),
      { maximumAge: 600_000, timeout: 8000 },
    );
  };

  const set = <K extends keyof Ctx>(k: K, v: Ctx[K]) => setCtx((c) => ({ ...c, [k]: v, ...(k === "temperature" || k === "humidity" || k === "sky" ? { weatherSource: "manual" as const } : {}) }));

  if (owned.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-10 text-center">
        <p className="font-heading text-2xl">Nothing to choose from yet</p>
        <p className="mt-2 text-sm text-muted-foreground">The selector only ever picks from bottles you own. Add a few first.</p>
        <Link href="/app/add" className="mt-4 inline-block text-sm text-primary underline-offset-4 hover:underline">
          Add bottles →
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[22rem_1fr]">
      {/* On a phone the answer comes first; the controls follow (lg: side by side, controls left). */}
      <form id="today-context" className="order-2 grid scroll-mt-24 content-start gap-6 lg:order-1" onSubmit={(e) => e.preventDefault()} aria-label="Today's context">
        <Chips label="Occasion" value={ctx.occasion} options={OCCASIONS.map((o) => [o, OCCASION_LABEL[o]] as const)} onChange={(v) => v && set("occasion", v)} />
        <Chips label="Time of day" value={ctx.daypart} options={[["day", "Daytime"], ["night", "Evening"]] as const} onChange={(v) => set("daypart", v)} allowNone />
        <div className="grid gap-3">
          <div className="flex items-center justify-between">
            <span className="label">Weather</span>
            <button type="button" onClick={useLocation} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
              <LocateFixed className="size-3.5" aria-hidden="true" /> Use my local weather
            </button>
          </div>
          {locating && (
            <p className="text-xs text-muted-foreground" role="status">
              {locating}
            </p>
          )}
          <Chips label="Temperature" value={ctx.temperature} options={[["cold", "Cold"], ["mild", "Mild"], ["hot", "Hot"]] as const} onChange={(v) => set("temperature", v)} allowNone />
          {ctx.temperature && (
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="inline-flex items-center gap-1.5">
                <input type="checkbox" checked={ctx.humidity === "humid"} onChange={(e) => set("humidity", e.target.checked ? "humid" : "dry")} className="size-4 accent-[var(--primary)]" />
                <Droplets className="size-4 text-muted-foreground" aria-hidden="true" /> Humid
              </label>
              <label className="inline-flex items-center gap-1.5">
                <input type="checkbox" checked={ctx.sky === "rainy"} onChange={(e) => set("sky", e.target.checked ? "rainy" : "clear")} className="size-4 accent-[var(--primary)]" />
                <CloudRain className="size-4 text-muted-foreground" aria-hidden="true" /> Rainy
              </label>
            </div>
          )}
        </div>
        <details className="group rounded-md border px-4 py-3">
          <summary className="flex cursor-pointer items-center justify-between text-sm select-none">
            <span>More options{moreSet ? <span className="text-muted-foreground"> · {moreSet} set</span> : null}</span>
            <span className="label">strength, mood, skip a bottle</span>
          </summary>
          <div className="mt-4 grid gap-6">
            <Chips label="How strong" value={ctx.desiredIntensity} options={[["soft", "Soft"], ["moderate", "Moderate"], ["strong", "Strong"]] as const} onChange={(v) => set("desiredIntensity", v)} allowNone />
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={ctx.indoors} onChange={(e) => set("indoors", e.target.checked)} className="size-4 accent-[var(--primary)]" /> Mostly indoors, close to people
            </label>
            <Chips label="Mood (optional)" value={ctx.mood} options={[["fresh", "Fresh"], ["cozy", "Cozy"], ["confident", "Confident"], ["romantic", "Romantic"], ["calm", "Calm"]] as const} onChange={(v) => set("mood", v)} allowNone />
            <fieldset>
              <legend className="label mb-2">Not today</legend>
              <div className="flex flex-wrap gap-1.5">
                {owned.map((o) => {
                  const on = ctx.excluded.includes(o.id);
                  return (
                    <button key={o.id} type="button" aria-pressed={on} onClick={() => set("excluded", on ? ctx.excluded.filter((x) => x !== o.id) : [...ctx.excluded, o.id])} className={cn("rounded-full border px-3 py-1 text-xs", on ? "border-destructive/50 text-destructive line-through" : "border-foreground/20 text-muted-foreground hover:border-foreground/50")}>
                      {o.name}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </div>
        </details>
      </form>

      <div aria-live="polite" aria-busy={loading} className={cn("order-1 transition-opacity lg:order-2", loading && res && "opacity-60")}>
        <p className="mb-3 flex flex-wrap items-baseline gap-x-2 text-sm text-muted-foreground lg:hidden">
          <span>
            For {OCCASION_LABEL[ctx.occasion].toLowerCase()}
            {ctx.daypart ? ` · ${ctx.daypart === "day" ? "daytime" : "evening"}` : ""}
            {ctx.temperature ? ` · ${ctx.temperature}` : ""}
          </span>
          <a href="#today-context" className="text-primary underline underline-offset-2">
            Adjust
          </a>
        </p>
        {!res && <div className="h-96 animate-pulse rounded-md border bg-muted/40" role="status" aria-label="Choosing" />}
        {res && "code" in res && (
          <p role="alert" className="border-l-2 border-destructive pl-3 text-sm text-destructive">
            {res.message}
          </p>
        )}
        {res && "status" in res && res.status === "empty" && (
          <div className="rounded-md border border-dashed p-10 text-center">
            <p className="font-heading text-2xl">No pick today</p>
            <p className="mt-2 text-sm text-muted-foreground">{res.message}</p>
          </div>
        )}
        {res && "status" in res && res.status === "ok" && (
          <div className="grid gap-6">
            <TopPick pick={res.picks[0]} owned={byId.get(res.picks[0].fragranceId)} requestId={res.requestId} explanation={res.explanation} onlyOne={res.onlyOne} />
            {res.picks.length > 1 && (
              <div>
                <p className="label mb-3">Or</p>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {res.picks.slice(1).map((p) => (
                    <li key={p.fragranceId} className="rounded-md border bg-card p-4">
                      <div className="flex items-center gap-3">
                        <ScentSwatch name={p.name} accords={byId.get(p.fragranceId)?.accords ?? []} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="label">{p.brand}</p>
                          <p className="font-heading text-xl leading-tight">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.factors.slice().sort((a, b) => b.value * b.weight - a.value * a.weight)[0]?.text}</p>
                        </div>
                        <span className="font-mono text-sm tabular-nums">{p.score}</span>
                      </div>
                      <Feedback requestId={res.requestId} fragranceId={p.fragranceId} compact />
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Picked from {res.considered} of your bottles by a deterministic ranker ({res.algorithmVersion}). Occasion fit is inferred from community data; treat it as a starting point.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function TopPick({ pick, owned, requestId, explanation, onlyOne }: { pick: DailyPick; owned?: Owned; requestId: string | null; explanation?: { text: string; source: "ai" | "template" }; onlyOne: boolean }) {
  return (
    <article className="grain overflow-hidden rounded-md border bg-card">
      <div className="grid gap-6 p-6 sm:grid-cols-[auto_1fr] sm:p-8">
        <ScentSwatch name={pick.name} accords={owned?.accords ?? []} size="xl" className="justify-self-center" />
        <div className="min-w-0">
          <p className="label !text-primary">Today&apos;s pick</p>
          <p className="label mt-3">{pick.brand}</p>
          <h2 className="text-5xl leading-none">
            <Link href={`/app/fragrance/${pick.fragranceId}`} className="hover:underline">
              {pick.name}
            </Link>
          </h2>
          {explanation && (
            <p className="mt-4 max-w-xl text-lg leading-relaxed">
              {explanation.text}
              <span className="ml-2 inline-flex items-center gap-1 align-middle font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
                {explanation.source === "ai" ? (
                  <>
                    <Sparkles className="size-3" aria-hidden="true" /> written by AI from the factors below
                  </>
                ) : (
                  "from the factors below"
                )}
              </span>
            </p>
          )}
          {onlyOne && <p className="mt-2 text-sm text-warning">It&apos;s the only eligible bottle today, so it wins by default.</p>}
          <dl className="mt-6 grid max-w-lg gap-2">
            {pick.factors.map((f) => (
              <div key={f.key} className="grid grid-cols-[7rem_1fr_2.5rem] items-center gap-3 text-sm">
                <dt className="label">{FACTOR_LABEL[f.key]}</dt>
                <dd className="text-xs">
                  <span className="mb-1 block h-1 rounded-full bg-muted" aria-hidden="true">
                    <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.round(f.value * 100)}%` }} />
                  </span>
                  {f.text}
                </dd>
                <dd className="text-right font-mono text-[11px] text-muted-foreground tabular-nums" title="Weight after renormalisation">
                  {Math.round(f.weight * 100)}%
                </dd>
              </div>
            ))}
          </dl>
          {pick.caveats.length > 0 && <p className="mt-3 text-xs text-warning">{pick.caveats.join(" · ")}</p>}
          <p className="mt-3 label">
            {pick.confidence} confidence · estimated fit {pick.score}
          </p>
          <Feedback requestId={requestId} fragranceId={pick.fragranceId} />
        </div>
      </div>
    </article>
  );
}

function Feedback({ requestId, fragranceId, compact = false }: { requestId: string | null; fragranceId: string; compact?: boolean }) {
  const [state, setState] = useState<"idle" | "wore" | "rejected" | "asking">("idle");
  const [error, setError] = useState<string | null>(null);
  const send = async (action: "wore" | "not_for_me", reason?: string) => {
    if (!requestId) return;
    setError(null);
    const r = await fetch("/api/intelligence/daily-pick/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId, fragranceId, action, reason }) });
    if (!r.ok) return setError((await r.json()).message);
    setState(action === "wore" ? "wore" : "rejected");
  };
  if (state === "wore") return <p className={cn("flex items-center gap-1 text-sm text-success", compact ? "mt-3" : "mt-6")}><Check className="size-4" aria-hidden="true" /> Logged as worn today</p>;
  if (state === "rejected") return <p className={cn("text-sm text-muted-foreground", compact ? "mt-3" : "mt-6")}>Noted. It&apos;ll count a little against this bottle in similar contexts.</p>;
  return (
    <div className={cn("flex flex-wrap items-center gap-2", compact ? "mt-3" : "mt-6")}>
      {state === "asking" ? (
        <>
          <span className="text-xs text-muted-foreground">Why?</span>
          {REASONS.map(([v, l]) => (
            <button key={v} type="button" onClick={() => send("not_for_me", v)} className="rounded-full border border-foreground/20 px-2.5 py-1 text-xs hover:border-foreground">
              {l}
            </button>
          ))}
        </>
      ) : (
        <>
          <button type="button" disabled={!requestId} onClick={() => send("wore")} className={cn("inline-flex items-center gap-1.5 rounded-full bg-ink text-ink-foreground", compact ? "h-8 px-3 text-xs" : "h-10 px-4 text-sm")}>
            <Check className="size-4" aria-hidden="true" /> Wore this
          </button>
          <button type="button" disabled={!requestId} onClick={() => setState("asking")} className={cn("inline-flex items-center gap-1.5 rounded-full border border-foreground/25", compact ? "h-8 px-3 text-xs" : "h-10 px-4 text-sm")}>
            <ThumbsDown className="size-4" aria-hidden="true" /> Not for me
          </button>
        </>
      )}
      {error && <span className="text-xs text-destructive" role="alert">{error}</span>}
    </div>
  );
}
