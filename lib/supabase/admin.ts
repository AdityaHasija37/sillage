import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/database.types";
import { supabaseUrl } from "./env";

function serviceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createClient<Database>(supabaseUrl(), key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/**
 * Service-role clients. Used for exactly two server-only jobs (DEC-40, DEC-48), and nowhere else:
 * the public briefing lookup (anon can't call it, so the rate limit can't be bypassed) and
 * provisioning one-click demo sandboxes.
 */
export const createBriefingLookupClient = serviceClient;
export const createDemoProvisioningClient = serviceClient;
