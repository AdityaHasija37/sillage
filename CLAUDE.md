# Sillage

Portfolio product: fragrance collection, deterministic recommendations, grounded Claude advisor, variant-aware price checks. Specs in `docs/specs/` are the source of truth; deviations go in `docs/DECISIONS.md`.

- Next.js 16 App Router (read `node_modules/next/dist/docs/` before using unfamiliar APIs), Supabase with RLS, Zod at every boundary.
- Never invent catalog data, prices, retailer coverage or metrics. Sample data is always labelled.
- Ranking lives in `lib/recommendation/engine.ts` (pure, tested). The advisor (`lib/agent/`) may explain results but never ranks or writes.
- After changing the engine or matcher: `npm test` and `npm run evals`; don't edit eval cases to make them pass.
- Before calling work done: `npm run check`, `npm run test:db`, `npm run test:e2e`.
