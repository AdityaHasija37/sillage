import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { createServiceClient } from "@/lib/supabase/admin";

export type RateBucket = "chat" | "offers" | "catalog_live" | "demo";

/** Per-bucket limits. Chosen to keep a public demo's API spend bounded (PRD: cost control). */
export const RATE_LIMITS: Record<RateBucket, { limit: number; windowSeconds: number }> = {
  chat: { limit: 20, windowSeconds: 3600 },
  offers: { limit: 12, windowSeconds: 3600 },
  catalog_live: { limit: 60, windowSeconds: 3600 },
  // Overridable for local end-to-end runs, which create many sandboxes from one address.
  demo: { limit: Number(process.env.DEMO_HOURLY_LIMIT) || 5, windowSeconds: 3600 },
};

/** Salted SHA-256 of the client IP, so counters never store an address. */
export async function clientKey(): Promise<string> {
  const h = await headers();
  const ip = h.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || h.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  return createHash("sha256").update(`${process.env.RATE_SALT ?? "sillage"}:${ip}`).digest("hex");
}

/** True while under the limit. Fails closed for chat/offers (they cost money), open for the rest. */
export async function claimRate(bucket: RateBucket, subject: string): Promise<boolean> {
  const { limit, windowSeconds } = RATE_LIMITS[bucket];
  try {
    const { data, error } = await createServiceClient().rpc("claim_rate", { p_bucket: bucket, p_subject: subject, p_limit: limit, p_window_seconds: windowSeconds });
    if (error) throw error;
    return data === true;
  } catch {
    return bucket === "catalog_live" || bucket === "demo";
  }
}
