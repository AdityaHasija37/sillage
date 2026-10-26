import { FunctionCallingConfigMode, ThinkingLevel, type Content, type FunctionDeclaration, type GoogleGenAI, type Part } from "@google/genai";
import { TOOL_DEFINITIONS } from "./tools";

/** Free-tier Flash model (ai.google.dev/gemini-api/docs/pricing). Override with GEMINI_MODEL. */
export const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";
/** Older free-tier Flash models to try when the first is overloaded. Override with GEMINI_FALLBACK_MODELS (comma-separated). */
export const DEFAULT_GEMINI_FALLBACKS = ["gemini-3.6-flash", "gemini-2.5-flash"];

/** Overloaded, unavailable or unknown-model errors are worth retrying elsewhere; quota and bad requests aren't. */
export const RETRYABLE = new Set([404, 500, 503, 504]);

type JsonSchema = Record<string, unknown>;

/**
 * Claude's strict tool schemas mark optional fields as required-but-nullable (anyOf [X, null]).
 * Gemini's schema subset is narrower, so those fields become plain optional ones here, and
 * `fillNulls` restores the null before the shared Zod validation runs. Validation is unchanged.
 */
function toGeminiSchema(schema: JsonSchema): { schema: JsonSchema; nullable: string[]; arrays: string[] } {
  const props = (schema.properties ?? {}) as Record<string, JsonSchema>;
  const nullable: string[] = [];
  const arrays: string[] = [];
  const properties: Record<string, JsonSchema> = {};
  for (const [key, p] of Object.entries(props)) {
    const anyOf = p.anyOf as JsonSchema[] | undefined;
    const inner = anyOf?.find((s) => s.type !== "null");
    if (anyOf && inner) {
      nullable.push(key);
      properties[key] = inner;
    } else {
      properties[key] = p;
    }
    if (properties[key].type === "array") arrays.push(key);
  }
  const required = ((schema.required ?? []) as string[]).filter((k) => !nullable.includes(k));
  return { schema: { type: "object", properties, ...(required.length ? { required } : {}) }, nullable, arrays };
}

const CONVERTED = TOOL_DEFINITIONS.map((t) => ({ name: t.name, description: t.description, ...toGeminiSchema(t.input_schema as JsonSchema) }));

export const GEMINI_TOOLS: FunctionDeclaration[] = CONVERTED.map((t) => ({ name: t.name, description: t.description, parametersJsonSchema: t.schema }));

/** Put back the nulls and empty lists Gemini leaves out, so the tool input matches the shared schema. */
export function fillNulls(name: string, args: Record<string, unknown> | undefined): Record<string, unknown> {
  const t = CONVERTED.find((c) => c.name === name);
  const out = { ...(args ?? {}) };
  if (!t) return out;
  for (const k of t.nullable) if (out[k] === undefined) out[k] = null;
  for (const k of t.arrays) if (out[k] === undefined) out[k] = [];
  return out;
}

/** Gemini 3.x takes a thinking level; 2.5 models take a token budget instead. */
export const thinkingFor = (model: string) => (/^gemini-2\./.test(model) ? { thinkingBudget: 512 } : { thinkingLevel: ThinkingLevel.LOW });

export type GeminiRound = { content: Content | undefined; calls: { id?: string; name: string; args: Record<string, unknown> }[]; finishReason: string | null; inputTokens: number; outputTokens: number; cachedTokens: number };

/** One generateContent call with the frozen system prompt and tool list. */
export async function geminiRound(client: GoogleGenAI, model: string, system: string, contents: Content[], lastRound: boolean): Promise<GeminiRound> {
  const res = await client.models.generateContent({
    model,
    contents,
    config: {
      systemInstruction: system,
      tools: [{ functionDeclarations: GEMINI_TOOLS }],
      // On the final allowed round the tools stay declared but the model must answer in text.
      toolConfig: { functionCallingConfig: { mode: lastRound ? FunctionCallingConfigMode.NONE : FunctionCallingConfigMode.AUTO } },
      thinkingConfig: thinkingFor(model),
      // We run the tools ourselves (approval-free reads, confirm-only writes), never the SDK.
      automaticFunctionCalling: { disable: true },
      maxOutputTokens: 4096,
    },
  });
  const candidate = res.candidates?.[0];
  const u = res.usageMetadata;
  return {
    content: candidate?.content,
    calls: (res.functionCalls ?? []).filter((c) => c.name).map((c) => ({ id: c.id, name: c.name as string, args: c.args ?? {} })),
    finishReason: candidate?.finishReason ?? null,
    inputTokens: u?.promptTokenCount ?? 0,
    outputTokens: (u?.candidatesTokenCount ?? 0) + (u?.thoughtsTokenCount ?? 0),
    cachedTokens: u?.cachedContentTokenCount ?? 0,
  };
}

export const textOf = (content: Content | undefined) =>
  (content?.parts ?? [])
    .filter((p: Part) => typeof p.text === "string" && !p.thought)
    .map((p: Part) => p.text)
    .join("")
    .trim();

/** Gemini blocks a response for safety with these reasons; treat them like a Claude refusal. */
export const BLOCKED = new Set(["SAFETY", "BLOCKLIST", "PROHIBITED_CONTENT", "SPII", "RECITATION"]);
