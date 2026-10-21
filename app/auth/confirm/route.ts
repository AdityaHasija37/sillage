import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/validation/auth";

const ALLOWED: EmailOtpType[] = ["email", "signup", "recovery", "email_change"];

/**
 * Handles links from confirmation and recovery emails. Supports both forms:
 * - `token_hash` + `type` (the custom templates in supabase/templates; works across devices)
 * - `code` (Supabase's default templates, via the PKCE redirect; same browser)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const next = safeNext(searchParams.get("next"));
  const supabase = await createClient();

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  if (tokenHash && type && ALLOWED.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  }

  const code = searchParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  }

  const failed = new URL("/login", request.url);
  failed.searchParams.set("error", "link");
  return NextResponse.redirect(failed);
}
