import { NextResponse } from "next/server";
import { z } from "zod";
import { runAdvisor, type HistoryTurn } from "@/lib/agent/advisor";
import { advisorContextFor } from "@/lib/agent/context";
import { getUser } from "@/lib/auth/session";
import { claimRate } from "@/lib/security/rate";
import { createClient } from "@/lib/supabase/server";

const Body = z.object({
  sessionId: z.string().uuid().nullable().optional(),
  message: z.string().trim().min(1, "Type a question").max(600, "Keep it under 600 characters"),
});

/** POST /api/chat — one advisor turn, grounded in the caller's own collection (FR-07). */
export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in to use the advisor" }, { status: 401 });
  const raw = await req.text();
  if (raw.length > 4000) return NextResponse.json({ error: "Message too long" }, { status: 413 });
  let json: unknown = null;
  try {
    json = JSON.parse(raw || "{}");
  } catch {}
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  if (!(await claimRate("chat", user.id))) {
    return NextResponse.json({ error: "You've reached the advisor's hourly limit (20 questions). Discover still works without limits." }, { status: 429 });
  }

  const supabase = await createClient();
  let sessionId = parsed.data.sessionId ?? null;
  let history: HistoryTurn[] = [];
  if (sessionId) {
    const { data } = await supabase.from("chat_messages").select("role, content").eq("session_id", sessionId).order("created_at").limit(20);
    history = (data ?? []).map((m) => ({ role: m.role as HistoryTurn["role"], content: m.content }));
  } else {
    const { data } = await supabase.from("chat_sessions").insert({}).select("id").single();
    sessionId = data?.id ?? null;
  }

  const ctx = await advisorContextFor(user.id);
  const reply = await runAdvisor(parsed.data.message, history, ctx);

  if (sessionId) {
    await supabase.from("chat_messages").insert([
      { session_id: sessionId, role: "user", content: parsed.data.message },
      // The trace stores tool names, summaries and timings: no secrets and no other users' data.
      { session_id: sessionId, role: "assistant", content: reply.text.slice(0, 8000), tool_summary_json: JSON.parse(JSON.stringify(reply.trace)) },
    ]);
  }

  // Resolve cited ids to display cards (all came from this user's tool results).
  const cited = reply.citedIds.length
    ? ((await supabase.from("fragrances").select("id, brand, name, family, accords").in("id", reply.citedIds)).data ?? [])
    : [];
  return NextResponse.json({ sessionId, ...reply, cited });
}
