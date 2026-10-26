import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";
import { configuredModel, configuredProvider, geminiModels, type AdvisorProvider } from "@/lib/agent/advisor";
import { isRetryable, textOf, thinkingFor } from "@/lib/agent/gemini";
import { claimRate } from "@/lib/security/rate";
import { explainPick, type DailyPick } from "./daily";

export type Explanation = { text: string; source: "ai" | "template" };

const SYSTEM =
  "You write one or two warm, plain sentences explaining why the first fragrance is today's pick, using only the facts given. Mention the first fragrance by its full name. Do not add notes, numbers, prices, weather or performance claims that aren't in the facts. No lists, no markdown.";

export function factsFor(picks: DailyPick[]): string {
  return picks.map((p) => `${p.rank}. ${p.brand} ${p.name}: ${p.factors.map((f) => f.text).join("; ")}${p.caveats.length ? `; caveat: ${p.caveats.join("; ")}` : ""}`).join("\n");
}

/** The model's sentence is used only if it names the pick, adds no numbers or prices, stays short and is complete. */
export function acceptExplanation(text: string, facts: string, pickName: string): boolean {
  const allowedDigits = new Set(facts.match(/\d+/g) ?? []);
  const newNumbers = (text.match(/\d+/g) ?? []).filter((d) => !allowedDigits.has(d));
  // A cut-off reply (token limit) doesn't end like a sentence.
  const complete = /[.!?]["'”’)]?$/.test(text);
  return Boolean(text) && complete && text.length <= 600 && text.includes(pickName) && newNumbers.length === 0 && !/\$|<|>/.test(text);
}

/**
 * PRD 08 §6.3: a model may turn the structured reason codes into a sentence, but it can't add
 * facts. Anything that fails the check, any error, a missing key or a spent rate limit falls back
 * to the deterministic template.
 */
export async function explainWithModel(picks: DailyPick[], subject: string, provider: AdvisorProvider | null = configuredProvider()): Promise<Explanation> {
  const top = picks[0];
  const template = { text: explainPick(top), source: "template" as const };
  if (!provider || !top) return template;
  // The selector re-runs on every chip change, so the model call is metered separately.
  if (!(await claimRate("explain", subject))) return template;
  const facts = factsFor(picks);
  try {
    const text = (await phrase(provider, `Facts:\n${facts}`)).trim();
    if (acceptExplanation(text, facts, top.name)) return { text, source: "ai" };
    console.warn("explain: model sentence rejected by the check", text.length);
    return template;
  } catch (e) {
    console.warn("explain: model call failed", (e as { status?: number })?.status ?? (e as Error)?.name, String((e as Error)?.message ?? "").slice(0, 300));
    return template;
  }
}

async function phrase(provider: AdvisorProvider, prompt: string): Promise<string> {
  const model = configuredModel(provider);
  if (provider === "gemini") {
    const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    let lastError: unknown;
    // An overloaded free model moves on to the next one; anything else falls back to the template.
    for (const m of geminiModels(model)) {
      try {
        const res = await client.models.generateContent({
          model: m,
          contents: prompt,
          config: { systemInstruction: SYSTEM, maxOutputTokens: 1024, thinkingConfig: thinkingFor(m), httpOptions: { timeout: 12_000 } },
        });
        return textOf(res.candidates?.[0]?.content);
      } catch (e) {
        lastError = e;
        if (!isRetryable(e)) throw e;
      }
    }
    throw lastError;
  }
  const res = (await new Anthropic().messages.create({
    model,
    max_tokens: 400,
    output_config: { effort: "low" },
    system: SYSTEM,
    messages: [{ role: "user", content: prompt }],
  } as never)) as Anthropic.Message;
  return res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join(" ");
}
