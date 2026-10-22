import { FAMILIES, FAMILY_LABEL, SEASONS, type Daypart, type Family, type Season } from "@/lib/domain/fragrance";

/**
 * Family mix as sorted horizontal bars: a magnitude job, so one hue (bronze) and direct count
 * labels. Families the user doesn't own are listed underneath in text instead of as empty bars.
 */
export function FamilyBars({ counts, total }: { counts: Record<Family, number>; total: number }) {
  const rows = FAMILIES.filter((f) => counts[f] > 0).sort((a, b) => counts[b] - counts[a]);
  const missing = FAMILIES.filter((f) => counts[f] === 0);
  const max = Math.max(1, ...rows.map((f) => counts[f]));
  return (
    <figure className="grid gap-3">
      <ul className="grid gap-2">
        {rows.map((f) => (
          <li key={f} className="grid grid-cols-[5.5rem_1fr_2.5rem] items-center gap-3 text-sm" title={`${FAMILY_LABEL[f]}: ${counts[f]} of ${total}`}>
            <span>{FAMILY_LABEL[f]}</span>
            <span className="h-3 rounded-full bg-muted" aria-hidden="true">
              <span className="block h-full rounded-full bg-primary" style={{ width: `${(counts[f] / max) * 100}%` }} />
            </span>
            <span className="text-right tabular-nums text-muted-foreground">{counts[f]}</span>
          </li>
        ))}
      </ul>
      {missing.length > 0 && (
        <figcaption className="text-xs text-muted-foreground">
          Not in your collection yet: {missing.map((f) => FAMILY_LABEL[f]).join(", ")}.
        </figcaption>
      )}
    </figure>
  );
}

const SEASON_LABEL: Record<Season, string> = { spring: "Spring", summer: "Summer", fall: "Fall", winter: "Winter" };

/**
 * Season × time-of-day coverage: how many bottles suit each cell, as a single-hue heat grid with
 * the count printed in every cell (colour is never the only signal) and a text summary for AT.
 */
export function CoverageGrid({ cells, summary }: { cells: Record<Season, Record<Daypart, number>>; summary: string }) {
  const max = Math.max(1, ...SEASONS.flatMap((s) => [cells[s].day, cells[s].night]));
  const shade = (n: number) => (n === 0 ? 0 : 0.18 + 0.72 * (n / max));
  return (
    <figure className="grid gap-3">
      <table className="w-full table-fixed border-separate border-spacing-1.5 text-sm">
        <caption className="sr-only">{summary}</caption>
        <thead>
          <tr>
            <th scope="col" className="w-16" />
            {SEASONS.map((s) => (
              <th key={s} scope="col" className="pb-1 text-left text-xs font-normal text-muted-foreground">
                {SEASON_LABEL[s]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(["day", "night"] as const).map((d) => (
            <tr key={d}>
              <th scope="row" className="text-left text-xs font-normal text-muted-foreground">
                {d === "day" ? "Day" : "Evening"}
              </th>
              {SEASONS.map((s) => {
                const n = cells[s][d];
                const a = shade(n);
                return (
                  <td key={s} title={`${SEASON_LABEL[s]} ${d === "day" ? "daytime" : "evening"}: ${n} bottle${n === 1 ? "" : "s"}`} className="h-12 rounded-lg border text-center align-middle tabular-nums" style={{ background: n ? `color-mix(in oklch, var(--primary) ${Math.round(a * 100)}%, var(--card))` : undefined, color: a > 0.55 ? "var(--primary-foreground)" : undefined }}>
                    {n === 0 ? <span className="text-xs text-muted-foreground">none</span> : n}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <figcaption className="text-xs text-muted-foreground">{summary}</figcaption>
    </figure>
  );
}
