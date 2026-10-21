"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { savePreferencesAction } from "@/app/(app)/app/actions";
import { FAMILIES, FAMILY_LABEL, SEASONS, type Family, type Season } from "@/lib/domain/fragrance";
import type { Preferences } from "@/lib/domain/profile";
import { cn } from "@/lib/utils";

const COMMON_NOTES = ["oud", "patchouli", "vanilla", "rose", "tobacco", "leather", "incense", "musk", "coconut", "lavender", "vetiver", "iris", "jasmine", "tuberose", "cinnamon", "coffee"];

export function PreferencesForm({ initial }: { initial: Preferences }) {
  const [p, setP] = useState(initial);
  const [budget, setBudget] = useState(initial.budgetMax ? String(initial.budgetMax) : "");
  const [pending, start] = useTransition();
  const dirty = JSON.stringify({ ...p, budgetMax: budget ? Number(budget) : null }) !== JSON.stringify(initial);

  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  return (
    <form
      className="grid gap-8"
      onSubmit={(e) => {
        e.preventDefault();
        const b = Number(budget);
        start(async () => {
          const r = await savePreferencesAction({ ...p, budgetMax: budget && b >= 10 ? Math.min(5000, Math.round(b)) : null });
          if (r.ok) toast.success("Preferences saved. Recommendations now use them.");
          else toast.error(r.error);
        });
      }}
    >
      <NoteField
        id="disliked"
        label="Notes to avoid"
        hint="Fragrances containing these are never recommended (e.g. oud also excludes agarwood)."
        values={p.dislikedNotes}
        onChange={(v) => setP({ ...p, dislikedNotes: v })}
        exclude={p.likedNotes}
      />
      <NoteField id="liked" label="Notes you seek" hint="A boost, not a requirement." values={p.likedNotes} onChange={(v) => setP({ ...p, likedNotes: v })} exclude={p.dislikedNotes} />

      <fieldset>
        <legend className="text-sm font-medium">Families you enjoy</legend>
        <p className="mb-2 text-xs text-muted-foreground">Optional. Used as a boost, and to judge what counts as a gap.</p>
        <div className="flex flex-wrap gap-1.5">
          {FAMILIES.map((f: Family) => (
            <Chip key={f} active={p.likedFamilies.includes(f)} onClick={() => setP({ ...p, likedFamilies: toggle(p.likedFamilies, f) })}>
              {FAMILY_LABEL[f]}
            </Chip>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-6 sm:grid-cols-2">
        <fieldset>
          <legend className="text-sm font-medium">Seasons you mostly shop for</legend>
          <p className="mb-2 text-xs text-muted-foreground">A soft preference when you don&apos;t pick a season in Discover.</p>
          <div className="flex flex-wrap gap-1.5">
            {SEASONS.map((s: Season) => (
              <Chip key={s} active={p.seasons.includes(s)} onClick={() => setP({ ...p, seasons: toggle(p.seasons, s) })}>
                {s[0].toUpperCase() + s.slice(1)}
              </Chip>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="text-sm font-medium">Time of day</legend>
          <p className="mb-2 text-xs text-muted-foreground">Also a soft preference.</p>
          <div className="flex flex-wrap gap-1.5">
            <Chip active={p.occasions.includes("day")} onClick={() => setP({ ...p, occasions: toggle(p.occasions, "day") })}>
              Daytime / office
            </Chip>
            <Chip active={p.occasions.includes("night")} onClick={() => setP({ ...p, occasions: toggle(p.occasions, "night") })}>
              Evening / date
            </Chip>
          </div>
        </fieldset>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        <div className="grid content-start gap-1.5">
          <Label htmlFor="pref-budget">Max budget per bottle (USD)</Label>
          <Input id="pref-budget" type="number" inputMode="numeric" min={10} max={5000} value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="No limit" className="h-9" />
        </div>
        <div className="grid content-start gap-1.5">
          <Label htmlFor="pref-longevity">Preferred longevity</Label>
          <select
            id="pref-longevity"
            value={p.performance.longevity ?? ""}
            onChange={(e) => setP({ ...p, performance: { ...p.performance, longevity: (e.target.value || undefined) as Preferences["performance"]["longevity"] } })}
            className="h-9 rounded-lg border bg-background px-2.5 text-sm"
          >
            <option value="">No preference</option>
            <option value="soft">Soft</option>
            <option value="moderate">Moderate</option>
            <option value="strong">Long-lasting</option>
          </select>
        </div>
        <fieldset className="grid content-start gap-1.5">
          <legend className="text-sm font-medium">Marketed for</legend>
          <div className="flex flex-wrap gap-1.5">
            {(["any", "men", "women"] as const).map((m) => (
              <Chip key={m} active={p.marketedFor === m} onClick={() => setP({ ...p, marketedFor: m })} radio>
                {m === "any" ? "Anything" : m === "men" ? "Men & unisex" : "Women & unisex"}
              </Chip>
            ))}
          </div>
        </fieldset>
      </div>
      <p className="-mt-4 text-xs text-muted-foreground">Sillage never guesses this from your collection: &ldquo;Anything&rdquo; means marketing labels are ignored.</p>

      <fieldset>
        <legend className="text-sm font-medium">Budget alternatives</legend>
        <p className="mb-2 text-xs text-muted-foreground">Fragrances the community says smell like a pricier one (often called dupes). They&apos;re always labelled with what they resemble.</p>
        <div className="flex flex-wrap gap-1.5">
          <Chip active={p.includeAlternatives} onClick={() => setP({ ...p, includeAlternatives: true })} radio>
            Include them
          </Chip>
          <Chip active={!p.includeAlternatives} onClick={() => setP({ ...p, includeAlternatives: false })} radio>
            Originals only
          </Chip>
        </div>
      </fieldset>

      <div className="flex items-center gap-3 border-t pt-6">
        <Button type="submit" size="lg" disabled={pending || !dirty}>
          {pending ? "Saving…" : "Save preferences"}
        </Button>
        {!dirty && <span className="text-sm text-muted-foreground">All changes saved</span>}
      </div>
    </form>
  );
}

function Chip({ active, onClick, children, radio = false }: { active: boolean; onClick: () => void; children: React.ReactNode; radio?: boolean }) {
  return (
    <button
      type="button"
      role={radio ? "radio" : undefined}
      aria-checked={radio ? active : undefined}
      aria-pressed={radio ? undefined : active}
      onClick={onClick}
      className={cn(
        "min-h-8 rounded-full border px-3 text-sm transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        active ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

function NoteField({ id, label, hint, values, onChange, exclude }: { id: string; label: string; hint: string; values: string[]; onChange: (v: string[]) => void; exclude: string[] }) {
  const [draft, setDraft] = useState("");
  const add = (raw: string) => {
    const v = raw.trim().toLowerCase().slice(0, 40);
    if (!v || values.includes(v) || values.length >= 40) return;
    onChange([...values, v]);
    setDraft("");
  };
  const suggestions = COMMON_NOTES.filter((n) => !values.includes(n) && !exclude.includes(n)).slice(0, 8);
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <p className="-mt-1 text-xs text-muted-foreground" id={`${id}-hint`}>
        {hint}
      </p>
      {values.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label={`${label} selected`}>
          {values.map((v) => (
            <li key={v} className="inline-flex items-center gap-1 rounded-full bg-accent py-0.5 pr-1 pl-3 text-sm text-accent-foreground">
              {v}
              <button type="button" aria-label={`Remove ${v}`} onClick={() => onChange(values.filter((x) => x !== v))} className="rounded-full p-0.5 hover:bg-background/60">
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Input
          id={id}
          aria-describedby={`${id}-hint`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(draft);
            }
          }}
          placeholder="Type a note and press Enter"
          className="h-9 max-w-xs"
        />
        <Button type="button" variant="outline" onClick={() => add(draft)} disabled={!draft.trim()}>
          Add
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {suggestions.map((n) => (
          <button key={n} type="button" onClick={() => add(n)} className="rounded-full border border-dashed px-2.5 py-0.5 text-xs text-muted-foreground hover:bg-muted">
            + {n}
          </button>
        ))}
      </div>
    </div>
  );
}
