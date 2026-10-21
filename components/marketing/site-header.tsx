import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";

export const GITHUB_URL = "https://github.com/AdityaHasija37/sillage";

export function SiteHeader() {
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
      <Link href="/" className="rounded-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
        <Logo />
      </Link>
      <nav aria-label="Site" className="flex items-center gap-1 text-sm">
        <Link href="/how-it-works" className="hidden rounded-md px-3 py-2 text-muted-foreground hover:text-foreground sm:inline">
          How it works
        </Link>
        <Link href="/evals" className="hidden rounded-md px-3 py-2 text-muted-foreground hover:text-foreground sm:inline">
          Evals
        </Link>
        <a href={GITHUB_URL} className="hidden rounded-md px-3 py-2 text-muted-foreground hover:text-foreground sm:inline">
          GitHub
        </a>
        <Link href="/login" className={buttonVariants({ variant: "ghost" })}>
          Sign in
        </Link>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 text-sm text-muted-foreground sm:px-6 md:grid-cols-[1fr_auto]">
        <div className="grid gap-2">
          <p>
            Built by <span className="text-foreground">Aditya Hasija</span>, product manager, as a portfolio project.
          </p>
          <p className="max-w-2xl text-xs leading-relaxed">
            Fragrance data: community notes, accords and votes from Fragrantica via the open{" "}
            <a href="https://codeberg.org/decant/pages" className="underline underline-offset-2">
              Decant dataset
            </a>
            , plus product listings from{" "}
            <a href="https://world.openbeautyfacts.org" className="underline underline-offset-2">
              Open Beauty Facts
            </a>{" "}
            (ODbL). Sillage is not affiliated with Fragrantica or any retailer and earns nothing from links.
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/how-it-works" className="hover:text-foreground">
            How it works
          </Link>
          <Link href="/evals" className="hover:text-foreground">
            Evals
          </Link>
          <a href={`${GITHUB_URL}/blob/main/docs/product/CASE-STUDY.md`} className="hover:text-foreground">
            Case study
          </a>
          <a href={GITHUB_URL} className="hover:text-foreground">
            GitHub
          </a>
          <Link href="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
        </nav>
      </div>
    </footer>
  );
}
