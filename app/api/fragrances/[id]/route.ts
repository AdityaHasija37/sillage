import { NextResponse } from "next/server";
import { getFragrance, SOURCE_LABEL } from "@/lib/catalog/service";

/** GET /api/fragrances/:id — details, known sizes and provenance (FR-08). */
export async function GET(_req: Request, ctx: RouteContext<"/api/fragrances/[id]">) {
  const { id } = await ctx.params;
  const f = await getFragrance(id);
  if (!f) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ fragrance: f, provenance: { source: SOURCE_LABEL[f.provider] ?? f.provider, sourceUrl: f.sourceUrl, dataQuality: f.dataQuality } });
}
