import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { configuredProvider } from "@/lib/agent/advisor";
import { createServiceClient } from "@/lib/supabase/admin";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";

/** GET /api/health — liveness plus which optional integrations are configured (never their values). */
export async function GET() {
  let db = false;
  try {
    const { error } = await createClient(supabaseUrl(), supabaseAnonKey()).from("fragrances").select("id", { head: true, count: "estimated" }).limit(1);
    db = !error;
  } catch {}
  // When the catalog refresh last ran, and the dataset date it loaded (DEC-56). Dates only.
  let catalog: { refreshedAt: string; datasetPublishedAt: string | null } | null = null;
  try {
    const { data } = await createServiceClient().from("catalog_refreshes").select("created_at, source_published_at").order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (data) catalog = { refreshedAt: data.created_at, datasetPublishedAt: data.source_published_at };
  } catch {}
  return NextResponse.json({
    ok: db,
    database: db,
    // "gemini" | "anthropic" | "offline": which model runs the advisor (never the key).
    advisor: configuredProvider() ?? "offline",
    offers: process.env.SERPAPI_API_KEY ? "live" : "sample",
    demo: process.env.DEMO_ENABLED !== "false",
    catalog,
  }, { status: db ? 200 : 503 });
}
