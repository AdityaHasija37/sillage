import { ApiError, FunctionCallingConfigMode, type Content, type GoogleGenAI } from "@google/genai";
import { describe, expect, it, vi } from "vitest";
import { configuredModel, configuredProvider, geminiModels, runAdvisor } from "@/lib/agent/advisor";
import { fillNulls, GEMINI_TOOLS, thinkingFor } from "@/lib/agent/gemini";
import { executeTool, TOOL_DEFINITIONS } from "@/lib/agent/tools";
import { acceptExplanation } from "@/lib/intelligence/explain";
import { context } from "../fixtures/advisor-context";

const INVENTED = "deadbeef-0000-4000-8000-000000000000";

type Req = { model: string; contents: Content[]; config: { toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode } } } };
type Call = { id?: string; name: string; args: Record<string, unknown> };

/** A generateContent response: model parts (each function call carries a thought signature), finish reason, usage. */
const reply = (o: { calls?: Call[]; text?: string; finish?: string }) => {
  const parts = [...(o.calls ?? []).map((c) => ({ functionCall: c, thoughtSignature: `sig-${c.name}` })), ...(o.text ? [{ text: o.text }] : [])];
  return {
    candidates: [{ content: { role: "model", parts }, finishReason: o.finish ?? "STOP" }],
    functionCalls: o.calls?.length ? o.calls : undefined,
    usageMetadata: { promptTokenCount: 120, candidatesTokenCount: 40, thoughtsTokenCount: 10 },
  };
};

function fakeGemini(script: ((req: Req) => ReturnType<typeof reply>)[]) {
  let i = 0;
  const generateContent = vi.fn(async (req: Req) => script[Math.min(i++, script.length - 1)](req));
  return { client: { models: { generateContent } } as unknown as GoogleGenAI, generateContent };
}

describe("provider selection", () => {
  it("uses the explicit provider, then Claude, then Gemini, else offline", () => {
    expect(configuredProvider({})).toBeNull();
    expect(configuredProvider({ GEMINI_API_KEY: "g" })).toBe("gemini");
    expect(configuredProvider({ GEMINI_API_KEY: "g", ANTHROPIC_API_KEY: "a" })).toBe("anthropic");
    expect(configuredProvider({ GEMINI_API_KEY: "g", ANTHROPIC_API_KEY: "a", ADVISOR_PROVIDER: "gemini" })).toBe("gemini");
    // Asking for a provider whose key is missing means offline, never a silent switch.
    expect(configuredProvider({ ANTHROPIC_API_KEY: "a", ADVISOR_PROVIDER: "gemini" })).toBeNull();
    expect(configuredModel("gemini", {})).toBe("gemini-3.6-flash");
    expect(configuredModel("gemini", { GEMINI_MODEL: "gemini-2.5-flash" })).toBe("gemini-2.5-flash");
  });
});

describe("Gemini tool schemas", () => {
  it("declares every tool, without the nullable unions Gemini's schema subset lacks", () => {
    expect(GEMINI_TOOLS.map((t) => t.name)).toEqual(TOOL_DEFINITIONS.map((t) => t.name));
    expect(JSON.stringify(GEMINI_TOOLS)).not.toMatch(/anyOf|additionalProperties|"null"/);
  });
  it("restores nulls Gemini leaves out, so the shared validation still passes", async () => {
    const args = fillNulls("recommend_candidates", { mode: "gaps" });
    expect(args).toMatchObject({ mode: "gaps", budget_max_usd: null, season: null, daypart: null, performance: null });
    await expect(executeTool("recommend_candidates", args, context())).resolves.toBeTruthy();
    expect(fillNulls("propose_preference_update", {})).toMatchObject({ add_disliked_notes: [], add_liked_notes: [], budget_max_usd: null });
  });
});

describe("runAdvisor on Gemini", () => {
  it("runs the tool loop, sends results back by name, keeps thought signatures, and grounds citations", async () => {
    let recId = "";
    const { client, generateContent } = fakeGemini([
      () => reply({ calls: [{ id: "a", name: "get_user_profile", args: {} }, { id: "b", name: "recommend_candidates", args: { mode: "different", season: "winter" } }] }),
      (req) => {
        const [modelTurn, results] = req.contents.slice(-2);
        // The model turn is replayed unchanged, thought signatures included.
        expect(modelTurn.parts?.every((p) => p.thoughtSignature)).toBe(true);
        // Both results come back in one user turn, matched by id and name.
        expect(results.parts?.map((p) => [p.functionResponse?.id, p.functionResponse?.name])).toEqual([["a", "get_user_profile"], ["b", "recommend_candidates"]]);
        recId = (results.parts?.[1].functionResponse?.response as { result: { candidates: { id: string }[] } }).result.candidates[0].id;
        return reply({ text: `Try this [[f:${recId}]]. And a made-up one [[f:${INVENTED}]].` });
      },
    ]);
    const r = await runAdvisor("Something different for winter", [{ role: "assistant", content: "Hi" }], context(), { gemini: client });
    expect(generateContent).toHaveBeenCalledTimes(2);
    expect(generateContent.mock.calls[0][0].contents[0].role).toBe("model");
    expect(r.trace).toMatchObject({ mode: "ai", provider: "gemini", model: "gemini-3.6-flash", costUsd: null });
    expect(r.trace.steps.map((s) => s.tool)).toEqual(["get_user_profile", "recommend_candidates"]);
    expect(r.citedIds).toEqual([recId]);
    expect(r.trace.grounding.removedIds).toEqual([INVENTED]);
    expect(r.trace.usage).toMatchObject({ inputTokens: 240, outputTokens: 100 });
  });

  it("returns a tool error to the model instead of crashing", async () => {
    const { client } = fakeGemini([
      () => reply({ calls: [{ name: "get_fragrance_details", args: { fragrance_id: "nope" } }] }),
      (req) => {
        expect(req.contents.at(-1)!.parts?.[0].functionResponse?.response).toHaveProperty("error");
        return reply({ text: "I couldn't find that one." });
      },
    ]);
    const r = await runAdvisor("details?", [], context(), { gemini: client });
    expect(r.trace.steps[0].ok).toBe(false);
  });

  it("caps tool rounds and forces a text answer on the last one", async () => {
    const { client, generateContent } = fakeGemini([(req) => (req.config.toolConfig.functionCallingConfig.mode === FunctionCallingConfigMode.NONE ? reply({ text: "Here's what I found." }) : reply({ calls: [{ name: "get_user_profile", args: {} }] }))]);
    const r = await runAdvisor("loop forever", [], context(), { gemini: client });
    expect(generateContent.mock.calls.length).toBe(7);
    expect(r.text).toBe("Here's what I found.");
  });

  it("says the free quota is used up and answers offline on a 429", async () => {
    const client = { models: { generateContent: vi.fn().mockRejectedValue(new ApiError({ message: "quota", status: 429 })) } } as unknown as GoogleGenAI;
    const r = await runAdvisor("Something different for winter under $150", [], context(), { gemini: client });
    expect(r.trace).toMatchObject({ mode: "offline", offlineReason: "quota" });
    expect(r.text).toMatch(/free quota/);
    expect(r.citedIds.length).toBeGreaterThan(0);
  });

  it("moves past an overloaded model to the next free model and stays on it", async () => {
    const overloaded = new ApiError({ message: "overloaded", status: 503 });
    const seen: string[] = [];
    let n = 0;
    const generateContent = vi.fn(async (req: Req) => {
      seen.push(req.model);
      if (req.model === "gemini-3.6-flash") throw overloaded;
      return ++n === 1 ? reply({ calls: [{ name: "get_user_profile", args: {} }] }) : reply({ text: "Here you go." });
    });
    const r = await runAdvisor("hi", [], context(), { gemini: { models: { generateContent } } as unknown as GoogleGenAI });
    expect(seen).toEqual(["gemini-3.6-flash", "gemini-3-flash-preview", "gemini-3-flash-preview"]);
    expect(r.trace).toMatchObject({ mode: "ai", model: "gemini-3-flash-preview" });
    expect(geminiModels("gemini-3.8-flash", {})).toEqual(["gemini-3.8-flash", "gemini-3-flash-preview", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite"]);
    expect(geminiModels("x", { GEMINI_FALLBACK_MODELS: "" })).toEqual(["x"]);
    expect(thinkingFor("gemini-2.5-flash")).toEqual({ thinkingBudget: 512 });
    expect(thinkingFor("gemini-3.6-flash")).toHaveProperty("thinkingLevel");
  });

  it("restarts the whole answer on the next model when the quota runs out mid-answer", async () => {
    const seen: string[] = [];
    const generateContent = vi.fn(async (req: Req) => {
      seen.push(req.model);
      // The first model answers round one, then hits its free quota on round two.
      if (req.model === "gemini-3.6-flash") {
        if (seen.length === 1) return reply({ calls: [{ name: "get_user_profile", args: {} }] });
        throw new ApiError({ message: "quota", status: 429 });
      }
      // A fresh start: the next model sees only the user's message, no foreign thought signatures.
      expect(req.contents).toHaveLength(1);
      return reply({ text: "Fresh start, same tools." });
    });
    const r = await runAdvisor("hi", [], context(), { gemini: { models: { generateContent } } as unknown as GoogleGenAI });
    expect(seen).toEqual(["gemini-3.6-flash", "gemini-3.6-flash", "gemini-3-flash-preview"]);
    expect(r.trace).toMatchObject({ mode: "ai", model: "gemini-3-flash-preview", steps: [] });
  });

  it("treats a timeout like an overload and moves to the next model", async () => {
    const timeout = Object.assign(new Error("timed out"), { name: "AbortError" });
    const generateContent = vi.fn(async (req: Req) => {
      if (req.model === "gemini-3.6-flash") throw timeout;
      return reply({ text: "Here you go." });
    });
    const r = await runAdvisor("hi", [], context(), { gemini: { models: { generateContent } } as unknown as GoogleGenAI });
    expect(r.trace).toMatchObject({ mode: "ai", model: "gemini-3-flash-preview" });
  });

  it("goes offline, and says the quota is the reason, when every free model is out", async () => {
    const client = { models: { generateContent: vi.fn().mockRejectedValue(new ApiError({ message: "quota", status: 429 })) } } as unknown as GoogleGenAI;
    const r = await runAdvisor("Something different for winter", [], context(), { gemini: client });
    expect(r.trace).toMatchObject({ mode: "offline", offlineReason: "quota" });
    expect((client.models.generateContent as ReturnType<typeof vi.fn>).mock.calls.length).toBe(4);
  });

  it("treats a safety block like a refusal", async () => {
    const { client } = fakeGemini([() => reply({ finish: "SAFETY" })]);
    const r = await runAdvisor("anything", [], context(), { gemini: client });
    expect(r.trace).toMatchObject({ mode: "offline", offlineReason: "refusal" });
  });
});

describe("Today's explanation check", () => {
  const facts = "1. Tom Ford Tobacco Vanille: Suits evening; Wearers favour it in cold weather";
  it("accepts a sentence that names the pick and adds nothing", () => {
    expect(acceptExplanation("Tobacco Vanille suits a cold evening out.", facts, "Tobacco Vanille")).toBe(true);
  });
  it("rejects new numbers, prices, markup or the wrong bottle", () => {
    expect(acceptExplanation("Tobacco Vanille lasts 12 hours.", facts, "Tobacco Vanille")).toBe(false);
    expect(acceptExplanation("Tobacco Vanille, now $199.", facts, "Tobacco Vanille")).toBe(false);
    expect(acceptExplanation("Wear Jazz Club tonight.", facts, "Tobacco Vanille")).toBe(false);
    expect(acceptExplanation("<b>Tobacco Vanille</b>", facts, "Tobacco Vanille")).toBe(false);
    // Cut off by the token limit.
    expect(acceptExplanation("Tobacco Vanille is today's pick because it is", facts, "Tobacco Vanille")).toBe(false);
  });
});
