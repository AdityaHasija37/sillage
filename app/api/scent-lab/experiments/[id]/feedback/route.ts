import { body, handle } from "@/lib/intelligence/http";
import { addExperimentFeedback } from "@/lib/intelligence/service";

/** POST /api/scent-lab/experiments/:id/feedback { rating, intensity?, notes?, repeat? } */
export async function POST(req: Request, ctx: RouteContext<"/api/scent-lab/experiments/[id]/feedback">) {
  const { id } = await ctx.params;
  return handle(async (u) => addExperimentFeedback(id, await body(req), u.isDemo));
}
