import { useId } from "react";
import { accordColor } from "@/lib/domain/accord-colors";
import { cn } from "@/lib/utils";

type Accord = { name: string; strength: number };

const SIZES = { xs: "h-10 w-8", sm: "h-16 w-12", md: "h-24 w-[4.5rem]", lg: "h-40 w-28", xl: "h-56 w-40" } as const;

/**
 * A bottle silhouette filled with bands of accord colour, strongest at the base. Decorative:
 * every place it's used also lists the accords as text, so it's hidden from screen readers.
 */
export function ScentSwatch({ accords, size = "md", className }: { accords: Accord[]; size?: keyof typeof SIZES; className?: string }) {
  const clip = useId();
  const top = accords.filter((a) => a.strength > 0).slice(0, 5);
  const total = top.reduce((s, a) => s + a.strength, 0) || 1;
  const bodyTop = 22;
  const bodyHeight = 74;
  // Stack bands upward from the base: each band starts where the stronger ones below it end.
  const heights = top.map((a) => (a.strength / total) * bodyHeight);
  const bands = top.map((a, i) => {
    const below = heights.slice(0, i + 1).reduce((s, h) => s + h, 0);
    return { name: a.name, y: bodyTop + bodyHeight - below, h: heights[i], color: accordColor(a.name) };
  });
  return (
    <svg viewBox="0 0 60 100" aria-hidden="true" className={cn(SIZES[size], "shrink-0 drop-shadow-sm", className)}>
      <defs>
        <clipPath id={clip}>
          <rect x="6" y={bodyTop} width="48" height={bodyHeight} rx="9" />
        </clipPath>
        <linearGradient id={`${clip}-shine`} x1="0" x2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.38" />
          <stop offset="0.35" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.08" />
        </linearGradient>
      </defs>
      <rect x="22" y="4" width="16" height="10" rx="2.5" className="fill-foreground/85" />
      <rect x="25" y="13" width="10" height="10" className="fill-foreground/25" />
      <g clipPath={`url(#${clip})`}>
        <rect x="6" y={bodyTop} width="48" height={bodyHeight} fill={top.length ? "#efe7da" : "#e7e1d8"} />
        {bands.map((b) => (
          <rect key={b.name} x="6" y={b.y} width="48" height={b.h + 0.5} fill={b.color} />
        ))}
        <rect x="6" y={bodyTop} width="48" height={bodyHeight} fill={`url(#${clip}-shine)`} />
      </g>
      <rect x="6" y={bodyTop} width="48" height={bodyHeight} rx="9" className="fill-none stroke-foreground/30" strokeWidth="1" />
    </svg>
  );
}
