import { SubmitButton } from "@/components/forms/submit-button";
import { demoEnabled } from "@/lib/demo/provision";
import { startDemo } from "@/app/demo/actions";

export function DemoShortcut() {
  if (!demoEnabled()) return null;
  return (
    <form action={startDemo} className="mt-4 rounded-2xl border border-dashed p-4 text-center text-sm">
      <p className="mb-2 text-muted-foreground">Just looking around?</p>
      <SubmitButton variant="outline" pendingLabel="Setting up your sample collection…">
        Try the demo, no sign-up
      </SubmitButton>
    </form>
  );
}
