import type { Metadata } from "next";
import { PreferencesForm } from "@/components/preferences/preferences-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { getUser } from "@/lib/auth/session";
import { getPreferences } from "@/lib/collection/service";
import { startDemo } from "@/app/demo/actions";

export const metadata: Metadata = { title: "Preferences" };

export default async function PreferencesPage() {
  const [prefs, user] = await Promise.all([getPreferences(), getUser()]);
  return (
    <div className="grid max-w-3xl gap-8">
      <header>
        <h1 className="text-4xl font-medium tracking-tight">Preferences</h1>
        <p className="mt-2 text-muted-foreground">What you tell Sillage directly always outweighs what it infers from your collection.</p>
      </header>
      <section className="rounded-2xl border bg-card p-6">
        <PreferencesForm initial={prefs} />
      </section>
      <section className="rounded-2xl border bg-card p-6" aria-labelledby="account-h">
        <h2 id="account-h" className="text-xl">
          Account
        </h2>
        {user?.isDemo ? (
          <div className="mt-2 grid gap-3 text-sm">
            <p className="text-muted-foreground">This is a private demo sandbox. It deletes itself 24 hours after it was created.</p>
            <form action={startDemo}>
              <SubmitButton variant="outline" pendingLabel="Creating a fresh sample…">
                Start over with a fresh sample collection
              </SubmitButton>
            </form>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Signed in as {user?.email}. To delete your account and all data, email the address on the{" "}
            <a href="/privacy" className="underline underline-offset-2">
              privacy page
            </a>
            .
          </p>
        )}
      </section>
    </div>
  );
}
