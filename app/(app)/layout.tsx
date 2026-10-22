import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { AccountMenu } from "@/components/app/account-menu";
import { BottomNav, TopNav } from "@/components/app/nav";
import { requireUser } from "@/lib/auth/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2">
        Skip to content
      </a>
      {user.isDemo && (
        <p className="bg-ink px-4 py-2 text-center text-[13px] text-ink-foreground">
          <span className="font-mono text-[11px] tracking-[0.08em] text-[oklch(0.8_0.1_55)] uppercase">Sample shelf</span>
          <span className="mx-2 opacity-40">·</span>
          Private to you, deletes itself in 24 hours. Change anything.{" "}
          <Link href="/register" className="underline underline-offset-4">
            Start your own
          </Link>
        </p>
      )}
      <header className="sticky top-0 z-30 border-b border-foreground/15 bg-background/92 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-end justify-between gap-6 px-4 pt-3 sm:px-6">
          <div className="flex items-end gap-10">
            <Link href="/app" className="mb-3 rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
              <Logo />
            </Link>
            <TopNav />
          </div>
          <div className="mb-2.5">
            <AccountMenu label={user.isDemo ? "Sample visitor" : user.displayName || user.email || "Account"} />
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-6xl min-w-0 flex-1 px-4 py-8 pb-24 sm:px-6 sm:py-12 md:pb-14 [&>*]:min-w-0">
        {children}
      </main>
      <footer className="hidden border-t border-foreground/10 md:block">
        <p className="mx-auto max-w-6xl px-6 py-5 text-xs text-muted-foreground">
          Scores, picks and pairings are estimates from community data, never measurements.{" "}
          <Link href="/how-it-works" className="underline underline-offset-2">
            How it works
          </Link>
        </p>
      </footer>
      <BottomNav />
    </div>
  );
}
