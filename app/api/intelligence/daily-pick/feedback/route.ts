import { body, handle } from "@/lib/intelligence/http";
import { dailyFeedback } from "@/lib/intelligence/service";

/** POST /api/intelligence/daily-pick/feedback { requestId, fragranceId, action, reason? }: idempotent (DS-05). */
export async function POST(req: Request) {
  return handle(async (u) => dailyFeedback(await body(req), u.isDemo));
}
