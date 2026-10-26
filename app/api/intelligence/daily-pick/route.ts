import { body, handle } from "@/lib/intelligence/http";
import { explainWithModel } from "@/lib/intelligence/explain";
import { runDailyPick } from "@/lib/intelligence/service";

/** POST /api/intelligence/daily-pick { occasion, weather?, daypart?, indoors?, desiredIntensity?, mood?, excludedFragranceIds? } */
export async function POST(req: Request) {
  return handle(async (u) => {
    const result = await runDailyPick(await body(req), u.isDemo);
    if (result.status !== "ok") return result;
    return { ...result, explanation: await explainWithModel(result.picks, u.id) };
  });
}
