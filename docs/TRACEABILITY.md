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
| A11Y | WCAG 2.2 AA (serious/critical) on 13 screens and states; keyboard-only flow; mobile no-overflow | `tests/e2e/a11y.spec.ts`, `mobile.spec.ts` | Pass |

## Release gates (QA doc)

| Gate | Status |
|---|---|
| A: types, build, lint | Pass (`npm run check`) |
| B: deterministic scoring and variant tests | Pass (52 unit tests) |
| C: authenticated access and RLS | Pass (38 pgTAP assertions) |
| D: demo walkthrough public without sign-up | Pass locally; public URL pending deploy (Q-02) |
| E: shipping and size caveats render | Pass (E2E-01, SHOP-05) |
| F: docs and limitations match shipping features | This file, README "Status and honest caveats" |
