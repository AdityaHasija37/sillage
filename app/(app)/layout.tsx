import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { BottomNav, SideNav } from "@/components/app/nav";
import { AdvisorLauncher } from "@/components/advisor/advisor-launcher";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { signOut } from "@/app/(auth)/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2">
        Skip to content
      </a>
      {user.isDemo && (
        <p className="bg-ink px-4 py-2 text-center text-sm text-ink-foreground">
          <strong className="font-medium">Sample collection.</strong> A private sandbox just for you; change anything, it deletes itself after 24 hours.{" "}
          <Link href="/register" className="underline underline-offset-4">
            Start your own
          </Link>
        </p>
      )}
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/app" className="rounded-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            <AdvisorLauncher />
            <span className="hidden max-w-48 truncate text-sm text-muted-foreground md:inline" title={user.email ?? undefined}>
              {user.isDemo ? "Demo visitor" : user.displayName || user.email}
            </span>
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-8 px-4 sm:px-6">
        <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-52 shrink-0 py-8 lg:block">
          <SideNav />
          <div className="mt-8 rounded-xl border border-dashed p-3 text-xs leading-relaxed text-muted-foreground">
            Recommendations are estimates from community data. Prices are shown only when found.{" "}
            <Link href="/how-it-works" className="underline underline-offset-2">
              How it works
            </Link>
          </div>
        </aside>
        <main id="main" className="min-w-0 flex-1 py-6 pb-24 sm:py-10 lg:pb-10">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
