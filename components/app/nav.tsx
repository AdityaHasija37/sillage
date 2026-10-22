"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, FlaskConical, Heart, Library, MessageCircle, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export const NAV = [
  { href: "/app", label: "Shelf", icon: Library, exact: true },
  { href: "/app/today", label: "Today", icon: Sun },
  { href: "/app/discover", label: "Discover", icon: Compass },
  { href: "/app/lab", label: "Scent Lab", icon: FlaskConical },
  { href: "/app/advisor", label: "Advisor", icon: MessageCircle },
  { href: "/app/wishlist", label: "Wishlist", icon: Heart },
] as const;

function isActive(pathname: string, href: string, exact?: boolean) {
  if (href === "/app") return pathname === "/app" || pathname.startsWith("/app/score") || pathname.startsWith("/app/collection") || pathname.startsWith("/app/add");
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

/** Desktop: underlined text tabs under the masthead. */
export function TopNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="hidden md:block">
      <ul className="flex gap-7">
        {NAV.map(({ href, label, ...rest }) => {
          const active = isActive(pathname, href, "exact" in rest ? rest.exact : false);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px inline-block border-b-2 py-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Phones: the five main destinations in a bottom bar. */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 border-t border-foreground/15 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <ul className="grid grid-cols-5">
        {NAV.slice(0, 5).map(({ href, label, icon: Icon, ...rest }) => {
          const active = isActive(pathname, href, "exact" in rest ? rest.exact : false);
          return (
            <li key={href}>
              <Link href={href} aria-current={active ? "page" : undefined} className={cn("flex min-h-14 flex-col items-center justify-center gap-0.5 font-mono text-[10px] tracking-wide uppercase focus-visible:bg-muted focus-visible:outline-none", active ? "text-primary" : "text-muted-foreground")}>
                <Icon className="size-5" aria-hidden="true" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
