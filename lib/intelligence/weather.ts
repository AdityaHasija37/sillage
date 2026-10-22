import { z } from "zod";

/**
 * Optional live weather (PRD 08 §4.1, §6.2): only after the user grants browser location, with the
 * coordinates rounded to ~10 km and never stored. Open-Meteo is free and needs no key. Any failure
 * falls back to the manual inputs, which always work (DS-02).
 */
export const WeatherQuery = z.object({ lat: z.number().min(-90).max(90), lon: z.number().min(-180).max(180) });

const OpenMeteo = z.object({
  current: z.object({ temperature_2m: z.number(), relative_humidity_2m: z.number(), precipitation: z.number().optional(), weather_code: z.number().optional() }),
});

export type WeatherBand = { temperature: "cold" | "mild" | "hot"; humidity: "dry" | "humid"; sky: "clear" | "rainy"; celsius: number; source: "api" };

export function bandFromReading(celsius: number, humidity: number, precipitation = 0, code = 0): Omit<WeatherBand, "source"> {
  return {
    temperature: celsius < 12 ? "cold" : celsius < 24 ? "mild" : "hot",
    humidity: humidity >= 70 ? "humid" : "dry",
    // WMO codes 51–67 and 80–82 are drizzle/rain/showers.
    sky: precipitation > 0.1 || (code >= 51 && code <= 67) || (code >= 80 && code <= 82) ? "rainy" : "clear",
    celsius: Math.round(celsius),
  };
}

export async function currentWeather(input: z.input<typeof WeatherQuery>): Promise<WeatherBand | null> {
  const q = WeatherQuery.safeParse(input);
  if (!q.success) return null;
  const lat = Math.round(q.data.lat * 10) / 10;
  const lon = Math.round(q.data.lon * 10) / 10;
  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code`, { signal: AbortSignal.timeout(5000), cache: "no-store" });
    if (!res.ok) return null;
    const body = OpenMeteo.safeParse(await res.json());
    if (!body.success) return null;
    const c = body.data.current;
    return { ...bandFromReading(c.temperature_2m, c.relative_humidity_2m, c.precipitation ?? 0, c.weather_code ?? 0), source: "api" };
  } catch {
    return null;
  }
}
