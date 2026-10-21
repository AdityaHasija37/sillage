import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/database.types";
import { supabaseUrl } from "./env";

/**
 * Service-role client. Server-only, never imported by client components (SEC-03), and used for
 * exactly four jobs (DEC-11): caching live catalog/offer results into shared tables, rate-limit
 * counters, and provisioning demo sandboxes. User data is always read with the user's own client.
 */
export function createServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createClient<Database>(supabaseUrl(), key, { auth: { persistSession: false, autoRefreshToken: false } });
}
