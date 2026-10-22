import "server-only";
import { NextResponse } from "next/server";
import { getUser, type SessionUser } from "@/lib/auth/session";
import { IntelligenceError } from "./service";

const STATUS: Record<IntelligenceError["code"], number> = { invalid: 400, not_owned: 404, not_found: 404, unavailable: 503 };

/** Auth + stable `{ code, message }` errors for every Collection Intelligence route (PRD §8, §12). */
export async function handle(fn: (user: SessionUser) => Promise<unknown>) {
  const user = await getUser();
  if (!user) return NextResponse.json({ code: "unauthenticated", message: "Sign in or open the sample shelf to use this." }, { status: 401 });
  try {
    return NextResponse.json(await fn(user));
  } catch (e) {
    if (e instanceof IntelligenceError) return NextResponse.json({ code: e.code, message: e.message }, { status: STATUS[e.code] });
    console.error("intelligence route failed", (e as Error)?.name);
    return NextResponse.json({ code: "unavailable", message: "Something went wrong. Your collection is unaffected." }, { status: 500 });
  }
}

export async function body(req: Request): Promise<unknown> {
  const text = await req.text();
  if (text.length > 4000) throw new IntelligenceError("invalid", "Request too large.");
  try {
    return JSON.parse(text || "{}");
  } catch {
    throw new IntelligenceError("invalid", "Invalid JSON.");
  }
}
