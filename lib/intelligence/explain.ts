import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { DEFAULT_MODEL } from "@/lib/agent/advisor";
import { explainPick, type DailyPick } from "./daily";

export type Explanation = { text: string; source: "ai" | "template" };

/**
 * PRD 08 §6.3: a model may turn the structured reason codes into a sentence, but it can't add
 * facts. The output is checked (names the pick, introduces no numbers, stays short); anything
 * else falls back to the deterministic template, as does any error or missing key.
 */
export async function explainWithModel(picks: DailyPick[], client: Anthropic | null = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null): Promise<Explanation> {
  const top = picks[0];
  const template = { text: explainPick(top), source: "template" as const };
  if (!client || !top) return template;
  const facts = picks.map((p) => `${p.rank}. ${p.brand} ${p.name}: ${p.factors.map((f) => f.text).join("; ")}${p.caveats.length ? `; caveat: ${p.caveats.join("; ")}` : ""}`).join("\n");
  try {
    const res = await client.messages.create({
      model: process.env.ADVISOR_MODEL || DEFAULT_MODEL,
      max_tokens: 400,
      output_config: { effort: "low" },
      system:
        "You write one or two warm, plain sentences explaining why the first fragrance is today's pick, using only the facts given. Mention the first fragrance by its full name. Do not add notes, numbers, prices, weather or performance claims that aren't in the facts. No lists, no markdown.",
      messages: [{ role: "user", content: `Facts:\n${facts}` }],
    } as never);
    const text = (res as Anthropic.Message).content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join(" ")
      .trim();
    const allowedDigits = new Set(facts.match(/\d+/g) ?? []);
    const newNumbers = (text.match(/\d+/g) ?? []).filter((d) => !allowedDigits.has(d));
    if (!text || text.length > 600 || !text.includes(top.name) || newNumbers.length || /\$|<|>/.test(text)) return template;
    return { text, source: "ai" };
  } catch {
    return template;
  }
}
