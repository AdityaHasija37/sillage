# Collection Intelligence: M0 audit and implementation plan

Source: [PRD 08 · Collection Intelligence](specs/08_Collection_Intelligence_PRD.md) (22 Oct 2026). This is the repository audit the PRD asks for before building (§14 M0, §15), and the plan it was built against.

## Audit: what already exists

| Area | What's there | Reuse for |
|---|---|---|
| Stack | Next.js 16 App Router, TypeScript, Tailwind v4, Zod, Supabase (Postgres + Auth + RLS), Vercel | Same patterns: server actions + route handlers, Zod at boundaries, RLS on every new table |
| Fragrance data | `fragrances` (38,365 rows): accords with strength 0–100, weighted note pyramid, family + Fragrantica family label, community votes for seasons, day/night, longevity (1–5), sillage (1–4), rating | Profile adapter (M1). **No occasion data exists** and no sourced intensity in hours |
| Collection | `collection_items` with sentiment (love/like/neutral/dislike/unrated), unique per user + fragrance + variant | Score inputs, selector candidates, Lab picker. Ownership ≠ liking already enforced |
| Wear history | None | New `wear_logs` table (PRD §16 open decision 1) |
| Auth + demo | Email/password; one-click **private sandbox** per visitor (real isolated account, deleted after 24 h) | Demo uses the same sandbox model: features read and write the sandbox's own rows, never anyone else's (PRD §4.2) |
| AI | Claude advisor (`lib/agent`), manual tool loop, grounding check, offline fallback | Optional phrasing of the Daily Selector explanation, with a deterministic template fallback; advisor gets read tools for the new features |
| Weather | None | Manual weather by default; optional "use my local weather" via the free Open-Meteo API with browser location consent, rounded coordinates, never stored |
| Analytics | None in Sillage | New `product_events` table with an event and property allowlist (PRD §11) |
| UI | Redesigned editorial system (Instrument Serif/Sans, Plex Mono labels, paper/ink/cognac), bottle illustrations | All new screens built in it |

## Key adaptations (logged as decisions)

- **Occasion fit is inferred, not sourced** (DEC-34). The data has seasons and day/night votes but no occasions. Occasion fit for casual, office, formal, evening/date and special events is derived from day/night share, projection and accords. It's labelled *inferred*, lowers confidence, and is never presented as catalog fact.
- **Intensity** comes from community projection and longevity votes (soft / moderate / strong), labelled as community estimates. No "longevity in hours" is shown, because none is sourced.
- **Demo persistence** uses the existing per-visitor sandbox, so saving experiments and logging wears work in the demo without touching other users.
- **Score cache**: not built. The score is computed in under 5 ms from data already loaded, so a cache would add invalidation risk without benefit (PRD §4.2 "only where warranted").

## Plan mapped to the PRD milestones

| Milestone | Files | Exit gate |
|---|---|---|
| M1 Profile adapter | `lib/intelligence/profile.ts` + fixtures | Unit tests: completeness, provenance, missing data stays missing |
| M2 Collection Score | `lib/intelligence/score.ts`, `/api/intelligence/collection-score(+/preview)`, Shelf score panel, `/app/score` simulator | CS-01..07 |
| M3 Daily Selector | `lib/intelligence/daily.ts`, `lib/intelligence/weather.ts`, `/api/intelligence/daily-pick(+/feedback)`, `/app/today` | DS-01..07 |
| M4 Scent Lab | `lib/intelligence/lab.ts` (with ruleset), `/api/scent-lab/*`, `/app/lab` | SL-01..07 |
| M5 Release | migrations + pgTAP, events, E2E, a11y, docs, deploy | Definition of done (PRD §14) |
