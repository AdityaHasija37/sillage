import "server-only";
import { z } from "zod";
import { getFragrance } from "@/lib/catalog/service";
import { getPreferences, listCollection } from "@/lib/collection/service";
import { matchingNotes } from "@/lib/recommendation/engine";
import { createClient } from "@/lib/supabase/server";
import { DailyContext, dailyPick, feedbackAdjustments, type DailyResult, type OwnedForDaily } from "./daily";
import { LAB_ALGORITHM_VERSION, pairKey, predictPair, type PairPrediction, type PastExperiment } from "./lab";
import { toProfile, type FragranceProfile } from "./profile";
import { collectionScore, previewCandidate, type CollectionScore, type ScorePreview } from "./score";

export class IntelligenceError extends Error {
  constructor(
    readonly code: "not_found" | "not_owned" | "invalid" | "unavailable",
    message: string,
  ) {
    super(message);
  }
}

// ── Analytics (PRD §11): allowlisted names and properties only ─────────────────

const EVENT_PROPS = {
  collection_score_viewed: ["collectionSize", "confidence", "algorithmVersion", "isDemo"],
  score_preview_completed: ["candidateId", "scoreDelta", "isDemo"],
  daily_selector_run: ["weatherSource", "occasion", "resultCount", "isDemo"],
  daily_pick_feedback_submitted: ["action", "reasonCode", "isDemo"],
  layering_prediction_created: ["confidence", "pairProfileCompleteness", "isDemo"],
  layering_experiment_saved: ["isDemo"],
  layering_feedback_submitted: ["rating", "wouldRepeat", "isDemo"],
} as const;
export type EventName = keyof typeof EVENT_PROPS;

/** Best effort: never blocks or fails a user action. Drops any property not on the allowlist. */
export async function track(name: EventName, props: Record<string, unknown>) {
  try {
    const allowed = EVENT_PROPS[name] as readonly string[];
    const properties: Record<string, string | number | boolean> = Object.fromEntries(Object.entries(props).filter(([k, v]) => allowed.includes(k) && ["string", "number", "boolean"].includes(typeof v))) as Record<string, string | number | boolean>;
    const supabase = await createClient();
    await supabase.from("product_events").insert({ name, properties });
  } catch {}
}

// ── Shared loading ──────────────────────────────────────────────────────────

async function ownedProfiles(): Promise<{ owned: OwnedForDaily[]; profiles: FragranceProfile[] }> {
  const [items, prefs] = await Promise.all([listCollection(), getPreferences()]);
  const owned = items.map((i) => ({ profile: toProfile(i.fragrance), sentiment: i.sentiment, dislikedNoteHit: prefs.dislikedNotes.length > 0 && matchingNotes(i.fragrance, prefs.dislikedNotes).length > 0 }));
  return { owned, profiles: owned.map((o) => o.profile) };
}

// ── F1 Collection Score ─────────────────────────────────────────────────────

export async function getCollectionScore(isDemo: boolean): Promise<CollectionScore> {
  const { profiles } = await ownedProfiles();
  const score = collectionScore(profiles);
  if (score.status === "ok") void track("collection_score_viewed", { collectionSize: score.collectionSize, confidence: score.confidence, algorithmVersion: score.algorithmVersion, isDemo });
  return score;
}

export async function previewScore(candidateFragranceId: string, isDemo: boolean): Promise<ScorePreview & { candidate: { id: string; brand: string; name: string } }> {
  if (!z.string().uuid().safeParse(candidateFragranceId).success) throw new IntelligenceError("invalid", "Choose a fragrance from the catalog.");
  const [{ profiles }, f] = await Promise.all([ownedProfiles(), getFragrance(candidateFragranceId)]);
  if (!f) throw new IntelligenceError("not_found", "That fragrance isn't in the catalog.");
  const result = previewCandidate(profiles, toProfile(f));
  if (result.status === "ok") void track("score_preview_completed", { candidateId: f.id, scoreDelta: result.delta, isDemo });
  return { ...result, candidate: { id: f.id, brand: f.brand, name: f.name } };
}

// ── F2 Daily Selector ───────────────────────────────────────────────────────

export async function runDailyPick(input: unknown, isDemo: boolean): Promise<DailyResult & { requestId: string | null }> {
  const parsed = DailyContext.safeParse(input);
  if (!parsed.success) throw new IntelligenceError("invalid", parsed.error.issues[0]?.message ?? "Invalid context");
  const supabase = await createClient();
  const [{ owned }, logs, fb] = await Promise.all([
    ownedProfiles(),
    supabase.from("wear_logs").select("fragrance_id, worn_at").order("worn_at", { ascending: false }).limit(500),
    supabase.from("daily_pick_feedback").select("fragrance_id, action, reason").order("created_at", { ascending: false }).limit(500),
  ]);
  const now = Date.now();
  const lastWornDaysAgo: Record<string, number | null> = {};
  for (const l of logs.data ?? []) if (lastWornDaysAgo[l.fragrance_id] == null) lastWornDaysAgo[l.fragrance_id] = (now - Date.parse(l.worn_at)) / 86_400_000;
  const result = dailyPick(parsed.data, owned, {
    lastWornDaysAgo,
    hasAnyLogs: (logs.data ?? []).length > 0,
    feedback: feedbackAdjustments((fb.data ?? []).map((r) => ({ fragranceId: r.fragrance_id, action: r.action as "wore" | "not_for_me", reason: r.reason }))),
  });
  let requestId: string | null = null;
  if (result.status === "ok") {
    const { data } = await supabase
      .from("daily_pick_sessions")
      .insert({ context_json: JSON.parse(JSON.stringify(result.context)), recommendation_json: JSON.parse(JSON.stringify(result.picks)), algorithm_version: result.algorithmVersion })
      .select("id")
      .single();
    requestId = data?.id ?? null;
  }
  void track("daily_selector_run", { weatherSource: parsed.data.weather?.source ?? "none", occasion: parsed.data.occasion, resultCount: result.status === "ok" ? result.picks.length : 0, isDemo });
  return { ...result, requestId };
}

export const DailyFeedbackInput = z.object({
  requestId: z.string().uuid(),
  fragranceId: z.string().uuid(),
  action: z.enum(["wore", "not_for_me"]),
  reason: z.enum(["too_strong", "too_weak", "poor_context", "dislike_scent", "other"]).nullable().optional(),
});

/** Idempotent (DS-05): repeating the same action for the same pick changes nothing. */
export async function dailyFeedback(input: unknown, isDemo: boolean): Promise<{ recorded: boolean; wearLogged: boolean }> {
  const p = DailyFeedbackInput.safeParse(input);
  if (!p.success) throw new IntelligenceError("invalid", "Invalid feedback");
  const supabase = await createClient();
  const { data: session } = await supabase.from("daily_pick_sessions").select("id, recommendation_json").eq("id", p.data.requestId).maybeSingle();
  if (!session) throw new IntelligenceError("not_found", "That suggestion has expired. Run the selector again.");
  const picks = (session.recommendation_json as { fragranceId: string }[]) ?? [];
  if (!picks.some((x) => x.fragranceId === p.data.fragranceId)) throw new IntelligenceError("invalid", "That fragrance wasn't one of the suggestions.");
  const { error } = await supabase
    .from("daily_pick_feedback")
    .upsert({ session_id: p.data.requestId, fragrance_id: p.data.fragranceId, action: p.data.action, reason: p.data.action === "not_for_me" ? (p.data.reason ?? null) : null }, { onConflict: "session_id,fragrance_id,action", ignoreDuplicates: true });
  if (error) throw new IntelligenceError("unavailable", "Couldn't save that. Try again.");
  let wearLogged = false;
  if (p.data.action === "wore") {
    const { error: e2 } = await supabase.from("wear_logs").upsert({ fragrance_id: p.data.fragranceId, source: "daily_pick", idempotency_key: `daily:${p.data.requestId}:${p.data.fragranceId}` }, { onConflict: "user_id,idempotency_key", ignoreDuplicates: true });
    wearLogged = !e2;
  }
  void track("daily_pick_feedback_submitted", { action: p.data.action, reasonCode: p.data.reason ?? "none", isDemo });
  return { recorded: true, wearLogged };
}

// ── F3 Scent Lab ────────────────────────────────────────────────────────────

async function pastExperiments(): Promise<PastExperiment[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("layering_feedback").select("rating, experiment:layering_experiments(prediction_json)").limit(200);
  return ((data ?? []) as unknown as { rating: number; experiment: { prediction_json: { dominantAccordHypotheses?: { tag: string }[] } } | null }[])
    .filter((r) => r.experiment)
    .map((r) => ({ rating: r.rating, accords: (r.experiment!.prediction_json.dominantAccordHypotheses ?? []).map((d) => d.tag) }));
}

export const PredictInput = z.object({ fragranceAId: z.string().uuid(), fragranceBId: z.string().uuid() });

export async function predict(input: unknown, isDemo: boolean): Promise<PairPrediction> {
  const p = PredictInput.safeParse(input);
  if (!p.success) throw new IntelligenceError("invalid", "Choose two bottles.");
  if (p.data.fragranceAId === p.data.fragranceBId) throw new IntelligenceError("invalid", "Choose two different bottles.");
  const [{ owned }, past] = await Promise.all([ownedProfiles(), pastExperiments()]);
  const a = owned.find((o) => o.profile.id === p.data.fragranceAId);
  const b = owned.find((o) => o.profile.id === p.data.fragranceBId);
  // Same response for "doesn't exist" and "not yours", so ids can't be probed (PRD §12).
  if (!a || !b) throw new IntelligenceError("not_owned", "Pick two bottles from your own collection.");
  const result = predictPair(a, b, past);
  if (result.status === "ok") void track("layering_prediction_created", { confidence: result.confidence, pairProfileCompleteness: Math.min(a.profile.completeness, b.profile.completeness), isDemo });
  return result;
}

export type Experiment = {
  id: string;
  pairKey: string;
  a: { id: string; brand: string; name: string; accords: { name: string; strength: number }[] };
  b: { id: string; brand: string; name: string; accords: { name: string; strength: number }[] };
  applicationOrder: "a_first" | "b_first" | "together";
  prediction: Extract<PairPrediction, { status: "ok" }>;
  algorithmVersion: string;
  createdAt: string;
  feedback: { id: string; rating: number; perceivedIntensity: string | null; notes: string | null; wouldRepeat: boolean | null; wornAt: string }[];
};

export async function listExperiments(): Promise<Experiment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("layering_experiments")
    .select("id, pair_key, application_order, prediction_json, algorithm_version, created_at, a:fragrances!layering_experiments_fragrance_a_id_fkey(id, brand, name, accords), b:fragrances!layering_experiments_fragrance_b_id_fkey(id, brand, name, accords), feedback:layering_feedback(id, rating, perceived_intensity, notes, would_repeat, worn_at)")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new IntelligenceError("unavailable", "Couldn't load your experiments.");
  return ((data ?? []) as unknown as {
    id: string;
    pair_key: string;
    application_order: Experiment["applicationOrder"];
    prediction_json: Experiment["prediction"];
    algorithm_version: string;
    created_at: string;
    a: Experiment["a"];
    b: Experiment["b"];
    feedback: { id: string; rating: number; perceived_intensity: string | null; notes: string | null; would_repeat: boolean | null; worn_at: string }[];
  }[]).map((r) => ({
    id: r.id,
    pairKey: r.pair_key,
    a: r.a,
    b: r.b,
    applicationOrder: r.application_order,
    prediction: r.prediction_json,
    algorithmVersion: r.algorithm_version,
    createdAt: r.created_at,
    feedback: [...r.feedback].sort((x, y) => y.worn_at.localeCompare(x.worn_at)).map((f) => ({ id: f.id, rating: f.rating, perceivedIntensity: f.perceived_intensity, notes: f.notes, wouldRepeat: f.would_repeat, wornAt: f.worn_at })),
  }));
}

export const SaveExperimentInput = z.object({ fragranceAId: z.string().uuid(), fragranceBId: z.string().uuid(), applicationOrder: z.enum(["a_first", "b_first", "together"]).default("a_first") });

/** Recomputes the prediction server-side rather than trusting a client snapshot. */
export async function saveExperiment(input: unknown, isDemo: boolean): Promise<{ id: string }> {
  const p = SaveExperimentInput.safeParse(input);
  if (!p.success) throw new IntelligenceError("invalid", "Choose two bottles.");
  const prediction = await predict({ fragranceAId: p.data.fragranceAId, fragranceBId: p.data.fragranceBId }, isDemo);
  if (prediction.status !== "ok") throw new IntelligenceError("invalid", prediction.status === "insufficient" ? prediction.message : "Choose two different bottles.");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("layering_experiments")
    .insert({ pair_key: pairKey(p.data.fragranceAId, p.data.fragranceBId), fragrance_a_id: p.data.fragranceAId, fragrance_b_id: p.data.fragranceBId, application_order: p.data.applicationOrder, prediction_json: JSON.parse(JSON.stringify(prediction)), algorithm_version: LAB_ALGORITHM_VERSION })
    .select("id")
    .single();
  if (error || !data) throw new IntelligenceError("unavailable", "Couldn't save the experiment.");
  void track("layering_experiment_saved", { isDemo });
  return { id: data.id };
}

export const ExperimentFeedbackInput = z.object({
  rating: z.number().int().min(1).max(5),
  intensity: z.enum(["soft", "moderate", "strong"]).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
  repeat: z.boolean().nullable().optional(),
});

/** Adds an observed result; the saved prediction is never modified (SL-05). */
export async function addExperimentFeedback(experimentId: string, input: unknown, isDemo: boolean): Promise<{ id: string }> {
  if (!z.string().uuid().safeParse(experimentId).success) throw new IntelligenceError("not_found", "Experiment not found.");
  const p = ExperimentFeedbackInput.safeParse(input);
  if (!p.success) throw new IntelligenceError("invalid", "Rate it from 1 to 5.");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("layering_feedback")
    .insert({ experiment_id: experimentId, rating: p.data.rating, perceived_intensity: p.data.intensity ?? null, notes: p.data.notes || null, would_repeat: p.data.repeat ?? null })
    .select("id")
    .single();
  if (error || !data) throw new IntelligenceError("not_found", "Experiment not found.");
  void track("layering_feedback_submitted", { rating: p.data.rating, wouldRepeat: p.data.repeat ?? false, isDemo });
  return { id: data.id };
}

export async function deleteExperiment(experimentId: string): Promise<void> {
  if (!z.string().uuid().safeParse(experimentId).success) throw new IntelligenceError("not_found", "Experiment not found.");
  const supabase = await createClient();
  const { data } = await supabase.from("layering_experiments").delete().eq("id", experimentId).select("id");
  if (!data?.length) throw new IntelligenceError("not_found", "Experiment not found.");
}
