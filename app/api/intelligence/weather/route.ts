import { body, handle } from "@/lib/intelligence/http";
import { IntelligenceError } from "@/lib/intelligence/service";
import { currentWeather } from "@/lib/intelligence/weather";

/** POST /api/intelligence/weather { lat, lon }: only after the user shares location; coordinates rounded, never stored. */
export async function POST(req: Request) {
  return handle(async () => {
    const w = await currentWeather((await body(req)) as { lat: number; lon: number });
    if (!w) throw new IntelligenceError("unavailable", "Live weather isn't available right now. Choose it manually instead.");
    return w;
  });
}
