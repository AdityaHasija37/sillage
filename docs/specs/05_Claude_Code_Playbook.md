# 05 · Claude Code Execution Playbook

*Build milestones, file organization, guardrails and copy-ready agent prompts*

Version 1.0 • 20 October 2026 • Status: build specification • Owner: independent portfolio project

Source of truth: this pack; if instructions conflict, record the decision in the Decision Register and update impacted documents. Assumptions are not verified production integrations.

## How to use this pack

Put the DOCX files in /reference (or extract their text to /docs/spec). Claude Code should summarize them as Markdown source-of-truth documents, then implement one milestone at a time. Commit after each accepted milestone. Do not ask Claude to complete all milestones in one run. Track open decisions and deviations in docs/DECISIONS.md.

## Suggested repository organization

app/(public), app/(auth), app/(app), app/api; components/ui, components/fragrance, components/dashboard; lib/catalog, lib/offers, lib/recommendation, lib/agent, lib/supabase, lib/schemas; db/migrations, db/seed; tests/unit, tests/integration, tests/e2e; docs/product, docs/architecture, docs/qa, docs/portfolio; public/demo-assets; README.md; .env.example; CLAUDE.md.

## Claude operating guardrails

Always plan first and state files to modify. Never invent API capabilities, retailer coverage, launch metrics or sample real prices. For missing provider access, implement typed mocks with visible “demo data” labels. Validate Zod inputs at service boundaries, enforce RLS, write or update tests for each change, run typecheck/lint/test/build, summarize failures. Never store tokens, credentials, PII or live user data in commits. Do not silently add scope.

## Milestone 0 — foundation

Build Next.js/TypeScript/Tailwind/shadcn project, theme, shell, clean routes, demo landing, shared error boundaries, CI and README. Gate: local dev and production build run, responsive nav, no console errors. Prompt: “Read all Sillage docs and create docs/IMPLEMENTATION_PLAN.md mapping FR IDs to services and routes. Scaffold only M0. Implement homepage and navigation, no fake backend. Add checks; report files, commands and risks.”

## Milestone 1 — data and authentication

Supabase project config, migrations/RLS, auth, seed fixture. Implement collection and wishlist services. Gate: five fragrance additions persist, isolation tests pass. Prompt: “Implement M1 only. Use schema from Architecture document. Provide SQL migrations, RLS, typed service layer, test fixtures and automated isolation tests. Do not expose service role key. Verify signup and guest demo separation.”

## Milestone 2 — searchable catalog

Build provider interface, catalog normalization, paginated search, detail and variant selectors. Implement verified external adapter only after test queries establish license/coverage; otherwise mock adapter and flags. Gate: test novel query beyond seed if live API configured, failure state works. Prompt: “Implement M2 with CatalogAdapter and MockCatalogAdapter, normalized typed models and provenance. No scraping prohibited websites. Expose search/detail routes, pagination and cached record persistence. Show which integration is live versus mock.”

## Milestone 3 — dashboard and profiles

Create onboarding/preferences and collection dashboard. Avoid misleading analytics with less than five items: show limited-data caveat. Gate: actual counts match records, mobile and keyboard usage. Prompt: “Implement M3 UI connected to real user DB with preference editor, owned grid, scent-family/season summaries, wishlist, empty states and accessible interactions. Do not infer liking from ownership.”

## Milestone 4 — recommendations

Implement deterministic eligibility/scoring and three discovery modes. Score fixtures and output stable reasons. Gate: exclusion and mode tests. Prompt: “Implement M4: recommendCandidates(input,profile,owned,catalog) with deterministic scoring and reason codes. Implement Similar, Different, Gap with variant/ownership exclusions and missing-data caveats. Build result cards. Include REC-01..REC-05 tests.”

## Milestone 5 — AI advisor

Claude-backed orchestrator with typed read tools, bounded tool runs and grounded response contract; accessible chat drawer. Gate: no invented fragrance IDs and graceful AI outage. Prompt: “Implement M5 chat as an optional tool-calling assistant. Read-only tools first; writes require explicit confirmation. Treat external metadata as untrusted. Output sourced candidate IDs and caveats. Add malicious-content, rate-limit and failure tests.”

## Milestone 6 — shopping

OfferProvider + mock; optional approved live shopping API; exact variant matching and honest price basis. Gate: SHOP-01..SHOP-06 tests. Prompt: “Implement M6 with an adapter and deterministic size/concentration/edition match checks. Show precise selected variant, matched retailers, listed vs landed cost, checkedAt and unavailable states. Never claim cheapest unless comparable offers and price basis are shown.”

## Milestone 7 — portfolio readiness

Deploy, guest demo, QA, public GitHub, visual refinements, case study, short walkthrough. Gate: no-login demo <2 min and traceability evidence. Prompt: “Implement M7: create isolated repeatable guest demo, responsive UX polish, clear source disclaimers, screenshots and public-facing README/case study. Execute tests, list measured outcomes only, and produce deployment checklist and known limitations.”

## Milestone sign-off template

Each milestone PR/commit description must include: delivered FR IDs, routes/tables affected, tests added, commands/output, accessibility checks, screenshots, limitations, unresolved questions, next milestone. Do not mark done until acceptance gate passes.

## Getting started — master prompt

“You are my senior full-stack engineer and product-focused implementation partner. Sillage is a portfolio-first fragrance collection, AI discovery, and price comparison app. Read all files in /docs and map every P0 requirement to an implementation plan. Work on M0 only. Use Next.js, TypeScript, Supabase, Claude API (later), and provider abstractions. Keep broad catalog search from launch design; keep minimum successful add flow at five fragrances. Never fabricate listings or model facts. First explain your architecture plan, then implement M0 and run validations.”
