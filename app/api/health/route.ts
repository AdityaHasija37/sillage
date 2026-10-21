import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";

/** GET /api/health — liveness plus which optional integrations are configured (never their values). */
export async function GET() {
  let db = false;
  try {
    const { error } = await createClient(supabaseUrl(), supabaseAnonKey()).from("fragrances").select("id", { head: true, count: "estimated" }).limit(1);
    db = !error;
  } catch {}
  return NextResponse.json({
    ok: db,
    database: db,
    advisor: process.env.ANTHROPIC_API_KEY ? "ai" : "offline",
    offers: process.env.SERPAPI_API_KEY ? "live" : "sample",
    demo: process.env.DEMO_ENABLED !== "false",
  }, { status: db ? 200 : 503 });
}
