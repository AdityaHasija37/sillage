"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { signOut } from "@/app/(auth)/actions";

export function AccountMenu({ label }: { label: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex max-w-48 items-center gap-1 rounded-full border border-foreground/20 px-3 py-1.5 text-sm hover:border-foreground/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
        <span className="truncate">{label}</span>
        <ChevronDown className="size-3.5" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem render={<Link href="/app/collection" />}>Manage collection</DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/app/add" />}>Add a bottle</DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/app/wishlist" />}>Wishlist</DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/app/preferences" />}>Preferences</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut()}>Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
