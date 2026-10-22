import { useId } from "react";
import { accordColor } from "@/lib/domain/accord-colors";
import { cn } from "@/lib/utils";

type Accord = { name: string; strength: number };

const SIZES = { xs: "h-11 w-9", sm: "h-16 w-12", md: "h-24 w-[4.5rem]", lg: "h-40 w-28", xl: "h-60 w-44" } as const;

type Shape = {
  /** Glass body path in a 60×100 box. */
  body: string;
  /** Cap rectangle: x, y, w, h, rx. */
  cap: [number, number, number, number, number];
  /** Neck rectangle under the cap. */
  neck: [number, number, number, number];
  /** Paper label: x, y, w, h. */
  label: [number, number, number, number];
  /** Top of the liquid (y). */
  fill: number;
};

// Five silhouettes, picked deterministically from the name so a fragrance always looks the same.
const SHAPES: Shape[] = [
  // Classic flacon
  { body: "M10 34 Q10 28 16 28 H44 Q50 28 50 34 V90 Q50 96 44 96 H16 Q10 96 10 90 Z", cap: [20, 6, 20, 15, 2.5], neck: [25, 20, 10, 9], label: [16, 52, 28, 22], fill: 40 },
  // Tall column
  { body: "M16 30 H44 V94 Q44 97 41 97 H19 Q16 97 16 94 Z", cap: [22, 2, 16, 21, 2], neck: [26, 22, 8, 9], label: [19, 50, 22, 28], fill: 38 },
  // Round
  { body: "M30 30 C47 30 56 44 56 62 C56 82 45 96 30 96 C15 96 4 82 4 62 C4 44 13 30 30 30 Z", cap: [22, 6, 16, 16, 7], neck: [26, 21, 8, 10], label: [17, 56, 26, 18], fill: 44 },
  // Heavy-cap square
  { body: "M8 40 H52 V92 Q52 96 48 96 H12 Q8 96 8 92 Z", cap: [14, 6, 32, 26, 3], neck: [24, 31, 12, 10], label: [15, 56, 30, 22], fill: 48 },
  // Apothecary (sloped shoulders)
  { body: "M24 28 H36 C46 34 50 40 50 48 V92 Q50 96 46 96 H14 Q10 96 10 92 V48 C10 40 14 34 24 28 Z", cap: [23, 6, 14, 14, 1.5], neck: [25, 19, 10, 10], label: [15, 56, 30, 22], fill: 42 },
];

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * A glass bottle tinted by the fragrance's accords, standing in for product photography (no images
 * are licensed). Decorative: every use also lists the accords or name in text.
 */
export function ScentSwatch({ accords, size = "md", className, name }: { accords: Accord[]; size?: keyof typeof SIZES; className?: string; name?: string }) {
  const id = useId().replace(/:/g, "");
  const top = accords.filter((a) => a.strength > 0).slice(0, 3);
  const shape = SHAPES[hash(name ?? top.map((a) => a.name).join("")) % SHAPES.length];
  const [c1, c2, c3] = [top[0], top[1] ?? top[0], top[2] ?? top[1] ?? top[0]].map((a) => (a ? accordColor(a.name) : "#d8cbb8"));
  const showLabel = size === "md" || size === "lg" || size === "xl";
  const [lx, ly, lw, lh] = shape.label;
  return (
    <svg viewBox="0 0 60 100" aria-hidden="true" className={cn(SIZES[size], "shrink-0 overflow-visible", className)}>
      <defs>
        <clipPath id={`b${id}`}>
          <path d={shape.body} />
        </clipPath>
        <linearGradient id={`l${id}`} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor={c3} stopOpacity="0.85" />
          <stop offset="0.5" stopColor={c2} stopOpacity="0.9" />
          <stop offset="1" stopColor={c1} />
        </linearGradient>
        <linearGradient id={`g${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="0.18" stopColor="#fff" stopOpacity="0.08" />
          <stop offset="0.75" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.16" />
        </linearGradient>
      </defs>
      {/* contact shadow */}
      <ellipse cx="30" cy="97.5" rx="22" ry="2.2" fill="#2a1d12" opacity="0.18" />
      {/* glass + liquid */}
      <g clipPath={`url(#b${id})`}>
        <rect x="0" y="0" width="60" height="100" fill="#f3ece2" opacity="0.9" />
        <rect x="0" y={shape.fill} width="60" height={100 - shape.fill} fill={`url(#l${id})`} />
        <rect x="0" y={shape.fill} width="60" height="1.2" fill="#fff" opacity="0.45" />
        <rect x="0" y="0" width="60" height="100" fill={`url(#g${id})`} />
      </g>
      <path d={shape.body} fill="none" stroke="#3a2a1d" strokeOpacity="0.35" strokeWidth="0.8" />
      {/* label */}
      {showLabel && (
        <g>
          <rect x={lx} y={ly} width={lw} height={lh} rx="0.8" fill="#fbf6ee" opacity="0.94" />
          <rect x={lx + 1.4} y={ly + 1.4} width={lw - 2.8} height={lh - 2.8} rx="0.4" fill="none" stroke="#3a2a1d" strokeOpacity="0.35" strokeWidth="0.35" />
          <rect x={lx + lw * 0.22} y={ly + lh * 0.42} width={lw * 0.56} height="1.6" fill="#3a2a1d" opacity="0.55" />
          <rect x={lx + lw * 0.32} y={ly + lh * 0.62} width={lw * 0.36} height="1" fill="#3a2a1d" opacity="0.3" />
        </g>
      )}
      {/* neck and cap */}
      <rect x={shape.neck[0]} y={shape.neck[1]} width={shape.neck[2]} height={shape.neck[3]} fill="#b9a993" />
      <rect x={shape.cap[0]} y={shape.cap[1]} width={shape.cap[2]} height={shape.cap[3]} rx={shape.cap[4]} fill="#211812" />
      <rect x={shape.cap[0] + 2} y={shape.cap[1] + 1.5} width="2" height={shape.cap[3] - 3} rx="1" fill="#fff" opacity="0.18" />
    </svg>
  );
}
