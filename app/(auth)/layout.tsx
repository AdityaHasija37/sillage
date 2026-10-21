import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-muted/40">
      <header className="px-4 py-5 sm:px-8">
        <Link href="/" className="rounded-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
          <Logo />
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pt-8 pb-16 sm:pt-16">
        <div className="w-full max-w-sm">
          {children}
          <p className="mt-6 text-center text-xs text-muted-foreground">
            <Link href="/privacy" className="hover:underline">
              How we handle your data
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
