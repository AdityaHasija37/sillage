import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export const GITHUB_URL = "https://github.com/AdityaHasija37/sillage";

const NAV = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/how-it-works#advisor", label: "The agent" },
  { href: "/evals", label: "Evals" },
];

export function SiteHeader() {
  return (
    <header className="border-b border-foreground/15">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
          <Logo />
        </Link>
        <nav aria-label="Site" className="flex items-center gap-1">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="label hidden rounded-sm px-3 py-2 hover:text-foreground sm:inline">
              {n.label}
            </Link>
          ))}
          <Link href="/login" className="label ml-2 rounded-full border border-foreground/30 px-4 py-2 !text-foreground hover:border-foreground">
            Sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-foreground/15">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">
            A collection companion for people who own more bottles than they can remember. Built by <span className="text-foreground">Aditya Hasija</span>, product manager.
          </p>
        </div>
        <nav aria-label="Product" className="grid content-start gap-2 text-sm">
          <p className="label mb-1">Product</p>
          <Link href="/how-it-works" className="hover:text-primary">
            How it works
          </Link>
          <Link href="/how-it-works#advisor" className="hover:text-primary">
            The advisor agent
          </Link>
          <Link href="/evals" className="hover:text-primary">
            Evals
          </Link>
          <Link href="/privacy" className="hover:text-primary">
            Privacy
          </Link>
        </nav>
        <nav aria-label="Project" className="grid content-start gap-2 text-sm">
          <p className="label mb-1">Project</p>
          <a href={`${GITHUB_URL}/blob/main/docs/product/CASE-STUDY.md`} className="hover:text-primary">
            Case study
          </a>
          <a href={`${GITHUB_URL}/blob/main/docs/DECISIONS.md`} className="hover:text-primary">
            Decision register
          </a>
          <a href={GITHUB_URL} className="hover:text-primary">
            Source on GitHub
          </a>
        </nav>
        <p className="text-xs leading-relaxed text-muted-foreground md:col-span-3">
          Fragrance data: notes, accords and community votes from Fragrantica via the open{" "}
          <a href="https://codeberg.org/decant/pages" className="underline underline-offset-2">
            Decant dataset
          </a>
          , and product listings from{" "}
          <a href="https://world.openbeautyfacts.org" className="underline underline-offset-2">
            Open Beauty Facts
          </a>{" "}
          (ODbL). Not affiliated with Fragrantica or any retailer; no affiliate links.
        </p>
      </div>
    </footer>
  );
}
