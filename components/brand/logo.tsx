import { cn } from "@/lib/utils";

/**
 * SillageAI mark: an atomizer on an ink tile, with the trail it leaves (sillage) ending in a spark (the AI).
 * Colours are fixed brand values so the mark reads the same on every surface; app/icon.svg is the same drawing.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={cn("size-8 shrink-0", className)}>
      <rect width="64" height="64" rx="14" fill="#211812" />
      <rect x="22" y="15" width="11" height="6" rx="1.5" fill="#f3ece2" />
      <rect x="24.5" y="21" width="6" height="4" fill="#f3ece2" />
      <rect x="15" y="25" width="25" height="28" rx="6" fill="none" stroke="#f3ece2" strokeWidth="2.4" />
      <path d="M21 40h13" stroke="#c2703a" strokeWidth="2" strokeLinecap="round" />
      <path d="M35 16c4-4 7 0 10-3s5-5 8-3" fill="none" stroke="#c2703a" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M53 6l1 2.8 2.8 1-2.8 1-1 2.8-1-2.8-2.8-1 2.8-1z" fill="#c2703a" />
    </svg>
  );
}

/** Mark plus the serif wordmark "Sillage" with an italic "AI". `compact` shows the mark alone. */
export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-foreground", className)}>
      <LogoMark className={compact ? "size-9" : "size-7"} />
      {compact ? (
        <span className="sr-only">SillageAI</span>
      ) : (
        <span className="font-heading text-[1.7rem] leading-none tracking-tight">
          Sillage<span className="ml-[0.04em] italic text-primary">AI</span>
        </span>
      )}
    </span>
  );
}
