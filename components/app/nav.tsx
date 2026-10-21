"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Heart, LayoutDashboard, Library, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export const NAV = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/app/collection", label: "Collection", icon: Library },
  { href: "/app/discover", label: "Discover", icon: Compass },
  { href: "/app/wishlist", label: "Wishlist", icon: Heart },
  { href: "/app/preferences", label: "Preferences", icon: SlidersHorizontal },
] as const;

function isActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function SideNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="grid gap-1">
      {NAV.map(({ href, label, icon: Icon, ...rest }) => {
        const active = isActive(pathname, href, "exact" in rest ? rest.exact : false);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
              active ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <ul className="grid grid-cols-5">
        {NAV.map(({ href, label, icon: Icon, ...rest }) => {
          const active = isActive(pathname, href, "exact" in rest ? rest.exact : false);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn("flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] focus-visible:bg-muted focus-visible:outline-none", active ? "text-primary" : "text-muted-foreground")}
              >
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
