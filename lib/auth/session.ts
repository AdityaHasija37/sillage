import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type SessionUser = { id: string; email: string | null; displayName: string | null; isDemo: boolean };

/** Verified user for this request, or null. Never trust a client-sent user id. */
export const getUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  const meta = (claims.user_metadata ?? {}) as { display_name?: string; demo?: boolean };
  return { id: claims.sub, email: (claims.email as string) ?? null, displayName: meta.display_name ?? null, isDemo: meta.demo === true };
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}
