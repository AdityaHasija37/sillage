import { SubmitButton } from "@/components/forms/submit-button";
import { demoEnabled } from "@/lib/demo/provision";
import { startDemo } from "@/app/demo/actions";

export function DemoShortcut() {
  if (!demoEnabled()) return null;
  return (
    <form action={startDemo} className="mt-10 border-t border-foreground/15 pt-6">
      <p className="label">Just looking?</p>
      <p className="mt-1 mb-3 text-sm text-muted-foreground">Open a private sample shelf: no email, nothing to set up.</p>
      <SubmitButton variant="outline" className="rounded-full" pendingLabel="Stocking your sample shelf…">
        Try the demo, no sign-up
      </SubmitButton>
    </form>
  );
}
