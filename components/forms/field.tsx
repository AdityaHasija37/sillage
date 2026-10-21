import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FieldProps = React.ComponentProps<typeof Input> & {
  label: string;
  name: string;
  errors?: string[];
  hint?: string;
};

/** Labelled input with inline, screen-reader-linked validation (UX-002 §7). */
export function Field({ label, name, errors, hint, className, id, ...props }: FieldProps) {
  const inputId = id ?? `field-${name}`;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const invalid = Boolean(errors?.length);
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={inputId}>{label}</Label>
      <Input
        id={inputId}
        name={name}
        aria-invalid={invalid || undefined}
        aria-describedby={cn(invalid && errorId, hint && hintId) || undefined}
        {...props}
      />
      {hint && !invalid && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {invalid && (
        <p id={errorId} className="text-sm text-destructive">
          {errors![0]}
        </p>
      )}
    </div>
  );
}

export function FormMessage({ state }: { state: { status: string; message?: string } }) {
  if (!state.message) return null;
  return (
    <p
      role={state.status === "error" ? "alert" : "status"}
      className={cn(
        "rounded-lg border px-3 py-2 text-sm",
        state.status === "error"
          ? "border-destructive/30 bg-destructive/5 text-destructive"
          : "border-primary/30 bg-accent text-accent-foreground",
      )}
    >
      {state.message}
    </p>
  );
}
