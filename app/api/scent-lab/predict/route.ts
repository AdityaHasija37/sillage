import { body, handle } from "@/lib/intelligence/http";
import { predict } from "@/lib/intelligence/service";

/** POST /api/scent-lab/predict { fragranceAId, fragranceBId } */
export async function POST(req: Request) {
  return handle(async (u) => predict(await body(req), u.isDemo));
}
