# Sillage

Portfolio product: fragrance collection, deterministic recommendations, grounded AI advisor (Gemini or Claude behind one provider-neutral loop), variant-aware price checks. Specs in `docs/specs/` are the source of truth; deviations go in `docs/DECISIONS.md`.

- Next.js 16 App Router (read `node_modules/next/dist/docs/` before using unfamiliar APIs), Supabase with RLS, Zod at every boundary.
- Never invent catalog data, prices, retailer coverage or metrics. Sample data is always labelled.
- Ranking lives in `lib/recommendation/engine.ts`; Score, Today and Scent Lab in `lib/intelligence/` (pure, versioned, tested). The advisor (`lib/agent/`) may explain results but never ranks or writes.
- After changing an engine, its weights or the matcher: `npm test` and `npm run evals`; don't edit eval cases to make them pass.
- Before calling work done: `npm run check`, `npm run test:db`, `npm run test:e2e`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
