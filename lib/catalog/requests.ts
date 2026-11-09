import "server-only";
import { claimRate } from "@/lib/security/rate";
import { createClient } from "@/lib/supabase/server";
import type { MutationResult } from "@/lib/collection/service";
import { normalizeRequest } from "./requests-shared";

/** Records that the signed-in user couldn't find a fragrance (DEC-58). Asking twice counts once. */
export async function requestFragrance(userId: string, query: string): Promise<MutationResult> {
  const text = query.trim().slice(0, 120);
  const normalized = normalizeRequest(text);
  if (!normalized || text.length < 2) return { ok: false, error: "Type the brand and name you were looking for." };
  if (!(await claimRate("request", userId))) return { ok: false, error: "Thanks, that's plenty of requests for now. Try again later." };
  const supabase = await createClient();
  const { error } = await supabase.from("fragrance_requests").insert({ query: text, normalized });
  if (error && error.code !== "23505") return { ok: false, error: "Couldn't send that. Try again." };
  return { ok: true };
}
