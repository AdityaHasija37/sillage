import { handle } from "@/lib/intelligence/http";
import { deleteExperiment } from "@/lib/intelligence/service";

/** DELETE /api/scent-lab/experiments/:id: removes the experiment and its feedback. */
export async function DELETE(_req: Request, ctx: RouteContext<"/api/scent-lab/experiments/[id]">) {
  const { id } = await ctx.params;
  return handle(async () => {
    await deleteExperiment(id);
    return { deleted: true };
  });
}
