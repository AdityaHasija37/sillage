import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ScentSwatch } from "@/components/fragrance/scent-swatch";
import { showcaseShelf } from "@/lib/catalog/showcase";

/** Split screen: a quiet form on paper, and a shelf of real catalog bottles on ink. */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const shelf = await showcaseShelf(6);
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.05fr]">
      <div className="grain flex flex-col px-6 py-6 sm:px-12">
        <Link href="/" className="self-start rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
          <Logo />
        </Link>
        <main className="flex flex-1 items-center py-12">
          <div className="w-full max-w-sm">{children}</div>
        </main>
        <p className="text-xs text-muted-foreground">
          <Link href="/privacy" className="hover:underline">
            How your data is handled
          </Link>
          <span className="mx-2">·</span>
          <Link href="/how-it-works" className="hover:underline">
            How it works
          </Link>
        </p>
      </div>
      <aside aria-hidden="true" className="relative hidden flex-col justify-between overflow-hidden bg-ink p-12 text-ink-foreground lg:flex">
        <p className="font-mono text-[11px] tracking-[0.1em] text-[oklch(0.8_0.1_55)] uppercase">A companion for your collection</p>
        <div>
          <div className="flex items-end justify-around gap-4 border-b-[10px] border-[oklch(0.38_0.06_50)] px-2">
            {shelf.map((f) => (
              <ScentSwatch key={f.id} name={f.name} accords={f.accords} size="lg" className="-mb-px" />
            ))}
          </div>
          <p className="mt-10 max-w-md font-heading text-4xl leading-tight">
            “Show me what I own, what it says about my taste, and <em className="text-[oklch(0.82_0.1_55)]">what&apos;s actually worth buying next.</em>”
          </p>
          <p className="mt-3 text-sm text-ink-foreground/65">The job Sillage is built for.</p>
        </div>
        <p className="text-xs text-ink-foreground/65">Bottles shown are the most-voted fragrances in the catalog.</p>
      </aside>
    </div>
  );
}
