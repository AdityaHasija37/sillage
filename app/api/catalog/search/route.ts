import { NextResponse } from "next/server";
import { searchCatalog, SearchQuery } from "@/lib/catalog/service";

/** GET /api/catalog/search?q=&page= — validated summaries, hasMore and per-source status (FR-02). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = SearchQuery.safeParse({ q: url.searchParams.get("q") ?? "", page: url.searchParams.get("page") ?? 0 });
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid query", items: [], hasMore: false, sources: [] }, { status: 400 });
  const live = url.searchParams.get("live") !== "0";
  const result = live ? await searchCatalog(parsed.data) : await searchCatalog(parsed.data, null);
  return NextResponse.json(result);
}
