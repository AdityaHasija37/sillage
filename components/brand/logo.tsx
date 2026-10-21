import { cn } from "@/lib/utils";

/** Wordmark plus a drifting-trail mark (sillage: the trail a scent leaves behind). */
export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-foreground", className)}>
      <svg viewBox="0 0 32 32" aria-hidden="true" className="size-7 shrink-0">
        <rect x="11" y="3" width="10" height="5" rx="1.5" className="fill-primary" />
        <path d="M9 11.5c0-1.4 1.1-2.5 2.5-2.5h9c1.4 0 2.5 1.1 2.5 2.5V26a3 3 0 0 1-3 3h-8a3 3 0 0 1-3-3V11.5Z" className="fill-none stroke-foreground" strokeWidth="1.6" />
        <path d="M12 21c2.2-2 4.4 2 8 0" className="fill-none stroke-primary" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      {!compact && <span className="font-heading text-xl font-medium tracking-tight">Sillage</span>}
    </span>
  );
}
