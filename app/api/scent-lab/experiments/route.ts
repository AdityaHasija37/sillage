import { body, handle } from "@/lib/intelligence/http";
import { listExperiments, saveExperiment } from "@/lib/intelligence/service";

/** GET /api/scent-lab/experiments */
export async function GET() {
  return handle(() => listExperiments());
}

/** POST /api/scent-lab/experiments { fragranceAId, fragranceBId, applicationOrder? }: prediction recomputed server-side. */
export async function POST(req: Request) {
  return handle(async (u) => saveExperiment(await body(req), u.isDemo));
}
