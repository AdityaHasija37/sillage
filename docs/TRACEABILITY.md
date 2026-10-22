# Traceability matrix

Every P0/P1 requirement in the [PRD](specs/01_Sillage_PRD.md) and test ID in the [QA doc](specs/04_QA_Traceability.md), mapped to the code that implements it and the tests that prove it. Test layers: **U** = Vitest unit (`tests/unit`), **DB** = pgTAP (`supabase/tests`), **E2E** = Playwright (`tests/e2e`), **EV** = eval suite (`tests/evals`, results in [evals/REPORT.md](evals/REPORT.md)).

## Functional requirements

| FR | Requirement | Implementation | Evidence |
|---|---|---|---|
| FR-01 | Email auth; demo without sign-in | `app/(auth)/*`, `lib/supabase/proxy.ts`, `lib/demo/provision.ts`, `app/demo/actions.ts` | E2E `demo.spec` E2E-01, SEC-02; `journey.spec` sign-up; DB `001_rls` |
| FR-02 | Search a broad catalog by brand/name; choose exact variant | `scripts/build-catalog.mjs` (38,365 records), `search_fragrances()` (trigram), `lib/catalog/{adapters,service}.ts` (Open Beauty Facts live fallback), `GET /api/catalog/search`, variant selector in `components/offers/offer-panel.tsx`, `ensure_variant()` | E2E `journey.spec` (5 searches); EV catalog coverage 20/20; DB variant tests |
| FR-03 | Add/remove owned, rating and liking | `lib/collection/service.ts`, `components/fragrance/{catalog-search,collection-grid}.tsx` | E2E `journey.spec` COL-01; DB duplicate + sentiment constraints |
| FR-04 | Preferences: notes to seek/avoid, budget, context, performance | `components/preferences/preferences-form.tsx`, `savePreferences()`, engine `contextFit()` | E2E `journey.spec` PRO-01; U "saved preferred seasons" |
| FR-05 | Dashboard: count, family mix, season/occasion coverage | `app/(app)/app/page.tsx`, `lib/domain/profile.ts` (`buildProfile`, `coverageCells`) | E2E `demo.spec` DASH-01 counts; a11y scan |
| FR-06 | Similar / Different / Fill gaps with ranked suggestions | `lib/recommendation/engine.ts`, `service.ts`, `components/discover/discover.tsx` | U REC-01..05 (+ variants); EV 30 personas; E2E E2E-01/02 |
| FR-07 | Optional AI chat using profile and collection via safe tools | `lib/agent/{advisor,tools,grounding,context}.ts`, `POST /api/chat`, `components/advisor/*` | U AI-01..03, SEC-05; EV grounding; E2E FR-07 |
| FR-08 | Detail with sourced notes, accords, data completeness | `app/(app)/app/fragrance/[id]/page.tsx`, `GET /api/fragrances/:id` | E2E E2E-01; a11y scan |
| FR-09 | Wishlist add/remove, move to owned | `lib/collection/service.ts`, `components/fragrance/wishlist-list.tsx` | E2E `journey.spec` WISH-01 |
| FR-10 | On-demand price search, variant-aware, attributed | `lib/offers/{match,providers,service}.ts`, `compareOffersAction` | U SHOP-01..06; EV 61 adversarial pairs; E2E E2E-01 |
| FR-11 | Relevant / not-relevant feedback (P1) | `recommendation_feedback`, `feedbackAction` | E2E FDBK-01; DB feedback ownership |
| FR-12 | Partial results and safe error states | Source status in search, sample-offer notices, offline advisor, Discover empty state | E2E `degraded.spec` E2E-03, SEC-04; U ERR-04 (`discover-empty.test`), AI-03 |
| FR-13 | Public demo, links to GitHub and docs | `app/page.tsx`, `/how-it-works`, `/evals`, footer links | E2E DEMO-01 (no login, < 2 min) |

## QA test IDs

| ID | What | Where | Status |
|---|---|---|---|
| REC-01 | Similar favours overlap with a positively rated fragrance | `tests/unit/recommendation.test.ts` | Pass |
| REC-02 | Different avoids the overlapping family, keeps preference fit | same | Pass |
| REC-03 | Gaps names an under-represented category; doesn't invent one | same (REC-03, REC-03b) + EV G03/G04 | Pass |
| REC-04 | Owned item excluded (by id and canonical identity) | same | Pass |
| REC-05 | Disliked note enforced (with synonyms, and no-note data) | same (REC-05, REC-05b) + E2E-02 DB check | Pass |
| SHOP-01..06 | Exact accept; EDT≠EDP; size; flanker; shipping disclosure; de-dup | `tests/unit/offers-match.test.ts` | Pass |
| CAT-01/02 | Query beyond seed; outage → error, not invented items | EV coverage; E2E-03 (search outage) | Pass |
| AI-01 | No invented fragrance ids reach the user | `tests/unit/advisor.test.ts`, EV grounding | Pass |
| AI-02 | Writes only after explicit confirmation | `advisor.test.ts` (propose tools + context has no mutations) | Pass |
| AI-03 | Graceful AI outage | `advisor.test.ts` (offline fallback), E2E-03 (chat abort) | Pass |
| SEC-01 | User A can't read user B's data | DB `001_rls.test.sql` (every user table) | Pass |
| SEC-02 | Demo can't touch other users | DB + E2E SEC-02 (two sandboxes) | Pass |
| SEC-03 | Server keys not in browser bundle | `scripts/check-bundle.mjs` after `next build` | Pass |
| SEC-04 | URL manipulation can't redirect offers to bad schemes; bad ids 404 | U SEC-04 (unsafe_url), E2E SEC-04 | Pass |
| SEC-05 | Malicious description can't trigger writes or leak secrets | U SEC-05 (untrusted labelling; no write tools) | Pass |
| E2E-01 | Guest demo → Fill gaps → grounded result → variant offers | `tests/e2e/demo.spec.ts` | Pass |
| E2E-02 | New account, five adds, dislikes oud, Different, wishlist persists | `tests/e2e/journey.spec.ts` | Pass |
| E2E-03 | Catalog and offer/AI failures still allow navigation | `tests/e2e/degraded.spec.ts` | Pass (offer failure covered by sample fallback + U) |
| DEMO-01..03 | No-login walkthrough, public docs | E2E-01 timing, `/how-it-works`, `/evals`, README | Pass |
| A11Y | WCAG 2.2 AA (serious/critical) on every app screen, including Today, Scent Lab, Score and Advisor; keyboard-only flow; mobile no-overflow | `tests/e2e/a11y.spec.ts`, `mobile.spec.ts` | Pass |

## Collection Intelligence (PRD 08)

| ID | Acceptance test | Implementation | Evidence |
|---|---|---|---|
| CS-01 | 0 bottles: helpful empty state, no fabricated score | `lib/intelligence/score.ts` `collectionScore` | U CS-01 |
| CS-02 | Same set and version → identical score | `score.ts` (`score-1.0`) | U CS-02; EV §5 |
| CS-03 | Dimensions 0–100; weights renormalise for missing dimensions | `score.ts` `appliedWeight` | U CS-03 |
| CS-04 | Exact duplicate doesn't raise the score | `score.ts` dedupe by id + canonical key | U CS-04; EV §5 |
| CS-05 | Preview doesn't mutate the shelf; changes recompute | `previewCandidate`, `POST /api/intelligence/collection-score/preview`, `components/intelligence/score-simulator.tsx` | U CS-05; E2E `intelligence.spec` CS-05 |
| CS-06 | Strengths, gaps, methodology, completeness, version | `score.ts`, Shelf `ScorePanel` | U CS-06 |
| CS-07 | Demo visitor sees a seeded score and previews a bottle without sign-up | `app/(app)/app/page.tsx`, `/app/score`, `lib/demo/provision.ts` | E2E CS-07 |
| DS-01 | Only owned bottles; avoid list honoured | `lib/intelligence/daily.ts` `dailyPick` | U DS-01; E2E DS-01..05; EV §5 |
| DS-02 | Manual weather works without location or network | `daily.ts`, `components/intelligence/daily-selector.tsx`, `lib/intelligence/weather.ts` (opt-in) | U DS-02; E2E DS-01..05 |
| DS-03 | Occasion or intensity re-ranks without reload | `daily-selector.tsx` (debounced autorun) | U DS-03; E2E DS-01..05 |
| DS-04 | Top 3 unique, each with 2+ grounded factors | `daily.ts` | U DS-04 |
| DS-05 | Feedback scoped to the user/demo; writes idempotent | `service.ts` `dailyFeedback`, `wear_logs` idempotency key, RLS | DB `002_intelligence_rls`; U feedback bounds; E2E DS-01..05 |
| DS-06 | Empty or all-excluded → helpful state, no invented picks | `daily.ts` | U DS-06 |
| DS-07 | Factor breakdown and low-confidence indicators visible | `daily.ts` renormalisation, `daily-selector.tsx` `TopPick` | U DS-07; a11y |
| SL-01 | Only owned bottles; not the same bottle twice | `lib/intelligence/lab.ts`, `service.ts` `predict` (`not_owned`), DB a≠b check | U SL-01; E2E SL-01..05 |
| SL-02 | A/B and B/A share one identity; order stored separately | `lab.ts` `pairKey` | U SL-02; EV §5 |
| SL-03 | Uncertain claims labelled; component rationale and confidence shown | `lab.ts` `RULESET`, `components/intelligence/scent-lab.tsx` | U SL-03; E2E SL-01..05 |
| SL-04 | Saved pairs survive reload; demos follow the sandbox model | `/api/scent-lab/experiments`, `layering_experiments` | E2E SL-01..05 |
| SL-05 | Logging a result doesn't change the stored prediction | `/api/scent-lab/experiments/[id]/feedback`, `layering_feedback` | E2E SL-01..05; DB |
| SL-06 | Feedback personalises in a bounded, testable way (±10) | `lab.ts` | U SL-06 |
| SL-07 | Missing accords → honest "insufficient information" | `lab.ts` | U SL-07 |
| Agent | Advisor can read score and today's pick | `lib/agent/tools.ts` `get_collection_score`, `pick_for_today` | U advisor tools + offline intents |

## Release gates (QA doc)

| Gate | Status |
|---|---|
| A: types, build, lint | Pass (`npm run check`) |
| B: deterministic scoring and variant tests | Pass (83 unit tests) |
| C: authenticated access and RLS | Pass (60 pgTAP assertions) |
| D: demo walkthrough public without sign-up | Pass locally and on https://sillage-rosy.vercel.app |
| E: shipping and size caveats render | Pass (E2E-01, SHOP-05) |
| F: docs and limitations match shipping features | This file, README "Status and honest caveats" |
