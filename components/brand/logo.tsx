import { cn } from "@/lib/utils";

/** Serif wordmark with a small drifting trail (sillage: the trail a scent leaves behind). */
export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-baseline gap-1.5 text-foreground", className)}>
      {!compact && <span className="font-heading text-[1.7rem] leading-none tracking-tight">Sillage</span>}
      <svg viewBox="0 0 28 10" aria-hidden="true" className={cn("h-2.5 w-7 text-primary", compact && "h-4 w-10")}>
        <path d="M1 7c4-5 7 2 11-1s6-4 9-2 4 2 6 0" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="1.5" cy="7" r="1.3" fill="currentColor" />
      </svg>
    </span>
  );
}
