"use client";

import { useState, useTransition } from "react";
import { Check, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requestFragranceAction } from "@/app/(app)/app/actions";

/** "Can't find it?": records the search as a missing-fragrance request (DEC-58). */
export function RequestMissing({ query, prominent = false }: { query: string; prominent?: boolean }) {
  const [pending, start] = useTransition();
  const [sentFor, setSentFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const text = query.trim();
  if (text.length < 2) return null;
  if (sentFor === text) {
    return (
      <p role="status" className="inline-flex items-center gap-1.5 text-sm text-success">
        <Check className="size-4" aria-hidden="true" /> Thanks. We&apos;ll look for “{text}” in the next catalog refresh.
      </p>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted-foreground">{prominent ? "Can't find it? It may be too new, or not in our sources yet." : "Not the one you meant?"}</span>
      <Button
        type="button"
        size="sm"
        variant={prominent ? "default" : "ghost"}
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await requestFragranceAction(text);
            if (r.ok) {
              setSentFor(text);
              setError(null);
            } else setError(r.error);
          })
        }
      >
        <Send aria-hidden="true" />
        Tell us “{text.length > 40 ? `${text.slice(0, 40)}…` : text}” is missing
      </Button>
      {error && (
        <span role="alert" className="text-destructive">
          {error}
        </span>
      )}
    </div>
  );
}
