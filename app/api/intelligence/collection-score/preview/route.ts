import { body, handle } from "@/lib/intelligence/http";
import { previewScore } from "@/lib/intelligence/service";

/** POST /api/intelligence/collection-score/preview { candidateFragranceId }: read-only (CS-05). */
export async function POST(req: Request) {
  return handle(async (u) => {
    const b = (await body(req)) as { candidateFragranceId?: unknown };
    return previewScore(String(b.candidateFragranceId ?? ""), u.isDemo);
  });
}
