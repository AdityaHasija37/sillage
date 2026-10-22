import { handle } from "@/lib/intelligence/http";
import { getCollectionScore } from "@/lib/intelligence/service";

/** GET /api/intelligence/collection-score (PRD 08 §8) */
export async function GET() {
  return handle((u) => getCollectionScore(u.isDemo));
}
