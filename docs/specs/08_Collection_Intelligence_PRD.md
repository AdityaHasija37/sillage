# Sillage | AI Collection Intelligence

Development-ready PRD • Collection Score · Daily Scent Selector · Scent Lab

Version 1.0  |  22 October 2026  |  Status: Proposed implementation specification

## 0. Implementation contract

This PRD defines incremental additions to the existing Sillage application. Claude Code must first inspect the repository, identify the framework, database, auth, fragrance catalog, AI provider, existing collection and recommendation entities, and reuse established patterns. Do not rewrite the app, invent integrations, or replace functioning product flows. Where this PRD specifies an API or table, adapt its naming to repo conventions while preserving behavior, privacy, testability, and acceptance criteria.

- Maintain the existing catalog, collection CRUD, AI advisor, and price comparison functionality.
- Preserve a no-login or demo path for recruiters wherever it already exists. Demo users must not be able to mutate another user’s data.
- Use deterministic, versioned calculations where possible. LLMs generate language, not core numerical scores.
- No manufactured performance claims: fragrance longevity, projection, layering compatibility and user preferences are estimates, not scientific measurements.
- Never expose LLM API credentials in the browser. Handle missing catalog metadata visibly.
## 1. Executive summary

Problem: fragrance collectors own bottles but lack a transparent way to assess collection gaps, select the right fragrance from what they own, or explore promising layering combinations without guesswork. Solution: three integrated capabilities built on a shared fragrance-profile model: Collection Score, Daily Scent Selector, and Scent Lab.

| Feature | User outcome | Release |
|---|---|---|
| F1 · Collection Score | Understand current coverage, overlap and potential impact of a new bottle | Phase 1 / P0 |
| F2 · Daily Scent Selector | Pick a suitable owned fragrance for the day with clear reasoning | Phase 2 / P1 |
| F3 · Scent Lab | Experiment with two owned scents and learn from post-wear feedback | Phase 3 / P1 |

## 2. Audience, jobs-to-be-done, and objectives

- Primary: beginner-to-intermediate fragrance collectors with 3–20 bottles who want to make better use of what they own.
- Secondary: enthusiasts with larger collections who want to reduce redundant purchases and discover new combinations.
- Recruiter/demo audience: anonymous viewers who need a meaningful, polished interaction without entering personal data.
Jobs: “Tell me what my collection does well and lacks”; “Help me choose a fragrance for my day”; “Can I combine these two scents, and what did I learn when I tried?”

| Goal | Metric / target (initial hypotheses) |
|---|---|
| Value discovery | ≥60% of demo visitors who open Intelligence view reach at least one feature result |
| Score usefulness | ≥70% of test users can explain a collection score based on displayed factors |
| Recommendation engagement | ≥25% of selector sessions save or confirm a pick |
| Experiment engagement | ≥20% of Scent Lab combinations are saved; ≥10% receive feedback |
| Reliability | ≥99% API success for valid local/demo fixture requests; no uncaught UI errors |

Targets are launch hypotheses, not existing product performance; instrument events and revise them after usage.

## 3. Scope boundaries and shared assumptions

- In scope: responsive web UI, profile-based deterministic scoring, contextual owned-bottle ranking, 2-bottle layering predictions, explanations, user feedback, persisted results, anonymous/demo fixtures, analytics events, and unit/integration tests.
- Out of scope: real-time fragrance chemistry simulation, sensor-based olfactory measurement, guaranteed compliment or projection outcomes, 3+ fragrance layering, purchase checkout, social network, push alerts, and full ML model training.
- For sparse profiles, show confidence levels and avoid false precision. Missing notes/accords should reduce confidence, not silently score as zeros.
- MVP fragrance profile: id, display name, brand, top/mid/base notes when available, normalized accord tags, family, season/daypart/occasion suitability when available, projection/longevity metadata only if sourced, confidence/provenance and image URL.
## 4. Shared foundations

### 4.1 Recommended normalized data contract

```typescript
FragranceProfile { id: string; brand: string; name: string; imageUrl?: string;
  families: string[]; accords: {tag:string; strength?:number}[];
  notes: {top:string[]; middle:string[]; base:string[]};
  seasonalFit?: Record<"spring"|"summer"|"fall"|"winter", number>;
  occasionFit?: Record<string, number>; daypartFit?: Record<"day"|"night", number>;
  intensity?: "soft"|"moderate"|"strong"; longevityHours?: number;
  provenance: Record<string, "catalog"|"curated"|"user"|"inferred">;
  completeness: number; updatedAt: string;
}
CollectionItem { id: string; ownerId: string; fragranceId: string; status:"owned"|"wishlist"; }
UserPreference { ownerId:string; dislikedAccords:string[]; preferredAccords:string[];
  preferredIntensity?:string; sensitivities?:string[]; }

```

Canonical values: suitability scores are 0–1 only when sourced or curated; weather is standardized into Fahrenheit/Celsius internally; store location only with explicit permission and only to the extent needed to obtain current conditions. Provide a manual weather fallback.

### 4.2 Platform/API standards

- Use existing app authentication/session conventions; scope every mutation and query to the authenticated user. Anonymous demo sessions use isolated seeded fixtures or local session state.
- Validate inputs on server with the repository’s existing validator; impose lengths and enum limits; use IDs rather than names as primary references.
- Version scoring/ranking logic (algorithmVersion), store timestamps, and calculate reproducibly with fixed catalog inputs.
- Cache derived score and recommendations only where warranted; invalidate on collection edit, profile update, algorithm version changes, or relevant context changes.
- AI explanation is optional enhancement. On AI errors, return templated, non-deceptive explanations from deterministic factor scores.
- Accessible controls: keyboard support, descriptive text, contrast, empty/loading/error states, and mobile responsiveness.
## 5. F1 — Sillage Collection Score

### 5.1 Experience and user stories

Entry point: Collection → “Collection Intelligence” card. Display overall score 0–100, component bars, top 2 strengths, top 2 gaps, and “What would this fragrance change?” simulator reachable from the catalog and wishlist. Every factor has a transparent help tooltip and no comparison to other users.

- As a collector, I can view a comprehensible score of my owned fragrances so I know whether my collection is balanced.
- As a user, I can inspect specific gaps and see recommended actions rather than arbitrary judgments.
- As a shopper, I can preview the score delta when adding a fragrance without actually adding it.
- As a user with a small collection, I am told that my score has limited confidence rather than shamed for not owning more bottles.
### 5.2 Deterministic scoring specification

Five dimensions, each 0–100. Weight distribution is an initial product decision and must be centralized in configuration. No LLM may produce these numeric values.

| Dimension / weight | Method (MVP deterministic heuristic) |
|---|---|
| Season coverage · 25% | Compute coverage of spring/summer/fall/winter from highest suitable owned bottles (0–1). Score average coverage ×100. |
| Occasion coverage · 25% | Coverage across daily/casual, office, formal, evening/date, special events; use maximal appropriate owned fit per context. |
| Versatility · 20% | Average of best 1–3 bottles’ breadth across season/daypart/occasion contexts; cap benefit of duplicates. |
| Scent diversity · 15% | Distinct families/accord clusters represented using normalized entropy and coverage; avoid rewarding raw collection size. |
| Low redundancy · 15% | 1 minus average nearest-neighbor similarity for owned bottles, using weighted family/accord overlap. Clamp to 0–100. |

```typescript
overall = round(0.25*season + 0.25*occasion + 0.20*versatility
               + 0.15*diversity + 0.15*nonRedundancy)
previewDelta = score(collection ∪ {candidate}) - score(collection)
// Deduplicate candidate fragrance ID. Same-bottle purchase must not inflate score.
// Scores only if >= 1 owned bottle; otherwise state "Add your first fragrance".

```

Similarity MVP: weighted Jaccard on normalized accords (60%) and families (40%); if either signal is missing, renormalize over available signals. Prefer dataset-defined accord strength; otherwise binary membership. For N<2, set redundancy dimension to neutral 50 and mark provisional. If a dimension lacks metadata, exclude it from weighted average and renormalize visible weights; record unavailable factors and display low confidence. A missing field must never be interpreted as poor quality.

Interpretation: 0–39 emerging, 40–59 developing, 60–79 balanced, 80–100 highly versatile. These are coverage descriptors, not absolute taste rankings. Show explanatory text that a lower score does not mean someone has “bad” fragrances. Avoid optimizing toward bigger collections; at most 1–3 representative fragrances are used per context.

### 5.3 Candidate score simulator

- Search a candidate from existing catalog (or select existing wishlist item). Show current score, hypothetical score, signed delta, dimensions increased/decreased, and “what this adds / where it overlaps.”
- Preview is read-only and must not save the candidate as owned; “Add to collection” uses existing flow separately.
- If candidate already owned, show duplicate indication and no false improvement.
- Provide a clear uncertainty indicator when note/accord metadata is sparse.
### 5.4 Requirements and acceptance tests

| ID | Acceptance criteria |
|---|---|
| CS-01 | With 0 owned bottles, component shows helpful empty state and no fabricated numerical score. |
| CS-02 | Same owned set and algorithm version always yield identical dimensions and overall score. |
| CS-03 | All dimensions stay within 0–100; weights applied correctly and renormalized for missing dimensions. |
| CS-04 | Adding exact duplicate catalog ID does not increase coverage/score. |
| CS-05 | Candidate preview does not mutate owned list; collection changes recompute score. |
| CS-06 | Every score exposes strengths, gaps, methodology, source completeness, and algorithm version. |
| CS-07 | Demo visitor can view seeded example and preview at least one new fragrance without signup. |

## 6. F2 — AI Daily Scent Selector

### 6.1 Experience and user stories

Entry point: home card “What should I wear today?” and Collection action. Context form: occasion (required, defaults Casual), weather (auto only with consent or manually chosen), indoors/outdoors, day/night, desired intensity, optional mood, and “avoid today” fragrance IDs. Output: one best owned pick, two ranked alternatives, short explanation, score drivers, profile confidence, and “Wore this” / “Not for me” feedback actions.

- As a collector, I can choose an owned fragrance suited to today’s context.
- As a privacy-conscious user, I can enter weather manually without granting location.
- As a user, I can see reasons for the suggestion and change inputs to rerank results.
- As a user, I can record my choice or reject a pick to refine later preferences.
### 6.2 Ranking logic

Filter to owned, available and not excluded. Ranking is deterministic with explainable components. Model weights are tunable product configuration; initial specification: occasion fit 30%, weather/season fit 25%, desired intensity 15%, personal accord preference 15%, daypart fit 10%, rotation freshness 5%. Missing suitability tags use neutral scores with confidence reduction, not arbitrary zero. If only one owned eligible fragrance, return it with transparent caveats.

```typescript
rankScore = .30*occasionFit + .25*weatherFit + .15*intensityFit
          + .15*preferenceFit + .10*daypartFit + .05*rotationFit
// Each factor normalized 0..1; unavailable -> omit + renormalize valid weights.
// Exclude user "avoid today" IDs. Deduplicate by fragranceId.

```

Weather mapping: user-selectable temperature band cold/mild/hot, plus dry/humid and rainy/clear. Translate fetched live weather to these categories on server; avoid hard rule that all sweet/heavy scents fail in summer. “Rotation freshness” rewards underworn suitable bottles without overpowering occasion compatibility. Optionally use recent wear logs; if absent, assign neutral score.

### 6.3 Feedback and transparency

- “Wore this” creates a wear log (or uses existing log model); repeated taps on same session must not duplicate entries.
- “Not for me” optionally records a reason: too strong, too weak, poor context match, dislike scent, other. Feedback should influence user preference fit conservatively; do not pretend a trainable ML model exists.
- LLM explanation can transform structured reason codes into natural language but cannot invent unknown note, performance, or weather claims.
- Weather API unavailable: show manual inputs and still return a result. No collection: show prompt to add bottles, never recommend unowned scents in this flow.
### 6.4 Acceptance criteria

| ID | Acceptance criteria |
|---|---|
| DS-01 | Results only include owned fragrances, excluding user-selected avoid IDs. |
| DS-02 | Manual weather works without location permission or network API. |
| DS-03 | Changing occasion or intensity can recompute ranking without page reload. |
| DS-04 | Top 3 contain no duplicates and each has 2+ grounded reason factors when data is available. |
| DS-05 | Preference and feedback are scoped to user/demo session; write is idempotent. |
| DS-06 | When collection is empty or all items are excluded, return a helpful state rather than fabricated candidates. |
| DS-07 | Ranking factor breakdown and low-confidence indicators are visible. |

## 7. F3 — Sillage Scent Lab

### 7.1 Differentiation and responsible framing

Scent Lab is an interactive two-bottle layering exploration workspace with structured, explainable heuristics and a feedback loop. It is not a chemical simulator and does not promise a real blended olfactory result. Its differentiator is a persistent, personal “prediction → real-world test → retrospective feedback” loop; basic layering recommendations already exist in competing apps.

### 7.2 User flow

Collection → Scent Lab → choose bottle A and bottle B from owned fragrance collection (distinct IDs) → generate predicted pairing → inspect compatible/clashing accord rationale, dominant-note hypotheses, estimated blend character, predicted intensity, occasion fit, and suggested application order/ratio → save experiment → after wearing, record result (success 1–5, perceived intensity, notes, would-repeat) → see history and personalization hints. Include sample fixture pairs for public demo.

### 7.3 Pairing computation

Compute compatibilityScore (0–100) as an experimental heuristic—not a scientific measure. Base: 35% accord complementarity, 25% clash penalty inverse, 20% intensity balance, 10% family contrast/moderation, 10% user preference fit. Maintain a small editable ruleset of complementary or tension accord pairs, with provenance and unit tests. “Clash” patterns should be treated as soft hypotheses, not categorical incompatibility. Score confidence is based on completeness and provenance. Never use speculative exact evaporation dynamics.

```typescript
pairKey = sort([fragranceAId, fragranceBId]).join(":")
compatibility = clamp(round(.35*complementarity + .25*(100-clashRisk)
   + .20*intensityBalance + .10*familyBalance + .10*preferenceFit), 0, 100)
// All terms independently normalized 0..100.
// For missing terms, renormalize present weights, degrade confidence.

```

Application suggestion: describe ratio as an optional starting experiment (e.g., A 1 spray + B 1 spray), not an evidence-based “optimal ratio.” Display skin sensitivity/over-application reminder and allow users to opt out of ratio guidance. Possible dominant accords should be labeled “predicted.”

### 7.4 Saved experiments and feedback

- Saved experiment includes order, fragrance IDs, snapshot of inputs, compatibility score, algorithmVersion, createdAt, updatedAt.
- Post-wear feedback is user-reported and must not overwrite the system’s historic prediction; retain both predicted and observed outcome for comparison.
- Use feedback for bounded personalized reranking (e.g., +/− at most 10 points on future similar accord combinations). Show “Based on your past feedback,” never claim global model learning.
- A pairing can be saved once or used in multiple separate wear tests. Support deleting saved experiments and associated feedback per product retention policy.
### 7.5 Acceptance criteria

| ID | Acceptance criteria |
|---|---|
| SL-01 | Picker only offers owned bottles; same bottle cannot occupy both slots. |
| SL-02 | A/B and B/A share canonical pairing identity; application order stored separately. |
| SL-03 | Pair prediction always labels uncertain claims and exposes component rationale/confidence. |
| SL-04 | Saving a pair survives reload for signed-in users; isolated demos follow repo’s session model. |
| SL-05 | User can log observed results without changing historical predicted result. |
| SL-06 | Feedback affects future personalization in a bounded, testable manner. |
| SL-07 | Missing notes/accords yield honest “insufficient information” output or low-confidence partial prediction. |

## 8. Proposed API interfaces

Illustrative REST contracts; adapt to existing framework and server conventions. All errors use stable code/message and suitable HTTP status.

```typescript
GET  /api/intelligence/collection-score
POST /api/intelligence/collection-score/preview { candidateFragranceId }
POST /api/intelligence/daily-pick { occasion, weather?, daypart?, indoors?,
  desiredIntensity?, mood?, excludedFragranceIds? }
POST /api/intelligence/daily-pick/feedback { requestId, fragranceId, action, reason? }
POST /api/scent-lab/predict { fragranceAId, fragranceBId, applicationOrder? }
GET  /api/scent-lab/experiments
POST /api/scent-lab/experiments { fragranceAId, fragranceBId, predictionSnapshot, ... }
POST /api/scent-lab/experiments/:id/feedback { rating, intensity?, notes?, repeat? }
DELETE /api/scent-lab/experiments/:id

```

Sample collection-score response fields: overallScore, dimensions[{key,score,weight,confidence}], strengths[], gaps[], coverageExplanations[], confidence, missingData[], algorithmVersion, updatedAt. Sample recommendation result fields: context, picks[{fragranceId,rank,score,factors[],reasonCodes[],confidence}], generatedAt, algorithmVersion, requestId. Sample pairing response fields: pairKey, score, confidence, complementFactors[], cautionFactors[], dominantAccordHypotheses[], suggestedStartingApplication, explanation, algorithmVersion.

## 9. Suggested persistence schema

| Entity | Fields / rules |
|---|---|
| collection_score_cache (optional) | ownerId, fingerprint, algorithmVersion, scoreJson, updatedAt; expire on relevant mutations |
| daily_pick_session | id, ownerId/demoSessionId, contextJson, recommendationJson, algorithmVersion, createdAt |
| daily_pick_feedback | id, sessionId, fragranceId, action, reason, createdAt; unique(sessionId,action,fragranceId) where useful |
| wear_log (reuse if exists) | id, ownerId, fragranceId, wornAt, source; idempotency key for selector submissions |
| layering_experiment | id, ownerId, canonicalPairKey, fragranceAId, fragranceBId, applicationOrder, predictionJson, algorithmVersion, timestamps |
| layering_feedback | id, experimentId, ownerId, rating 1–5, perceivedIntensity?, notes?, wouldRepeat?, wornAt |

Use migrations, foreign keys, indexes on ownerId and dates, and cascade or explicit privacy-aware deletes. Avoid persisting precise GPS coordinates. If an existing wear log or saved recommendation table is available, extend rather than duplicate.

## 10. Screens and states

| Screen | Critical elements |
|---|---|
| Collection Intelligence | Score hero, 5 factor bars, score confidence, strengths/gaps, score explainer, preview entry |
| Candidate Preview | Search/select bottle, before vs after dimensions, added coverage, overlap, no mutation until user acts |
| Daily Selector | Manual/auto weather selector, occasion, daypart, intensity, owned ranked cards, feedback actions |
| Scent Lab | Two owned-bottle selectors, prediction result, explanation breakdown, save, wear feedback form, history |
| Demo Mode | Prepopulated 6-bottle diverse collection and 2 layering examples with obvious “Sample data” label |

All screens must cover: initial, loading, populated, empty collection, partial metadata, API error, and mobile view. Empty collection state suggests adding a fragrance; no phantom scores. Do not gate read-only demo behind registration.

## 11. Tracking, telemetry, privacy

| Event | Important properties |
|---|---|
| collection_score_viewed | collectionSize, confidence, algorithmVersion, isDemo |
| score_preview_completed | candidateId, scoreDelta, isDemo |
| daily_selector_run | weatherSource(manual/api), occasion, resultCount, isDemo |
| daily_pick_feedback_submitted | action, reasonCode, isDemo |
| layering_prediction_created | confidence, pairProfileCompleteness, isDemo |
| layering_experiment_saved | isDemo |
| layering_feedback_submitted | rating, wouldRepeat, isDemo |

Do not send personal notes, precise location or sensitive user details into product analytics. Respect consent and existing analytics configuration. Use anonymized metrics and rate-limit public demo/API endpoints.

## 12. Error handling and security

- User authorization: ownership checks for every collection item, experiment, session and feedback update.
- Robust input validation: bounded arrays/strings, allowed enums, enforce distinct layering IDs, reject nonexistent fragrance IDs.
- Prevent cross-user ID enumeration; use opaque identifiers and consistent not-found responses.
- Debounce repeated simulation inputs; ensure idempotent wear and feedback actions.
- Graceful fallback without weather or AI provider. Never render unescaped model text as HTML.
- A demo user cannot change production collection data. Consider demo rate limits and seed fixture resets.
## 13. Test plan

- Unit: dimensions, normalization, weight renormalization, similarity symmetry, duplicate handling, clamping, algorithm version, ranking ties, pairing key canonicalization, bounded feedback.
- Integration: existing collection CRUD triggers recalculation; authentication prevents cross-user data access; persistence survives refresh; weather and AI fail gracefully.
- E2E: demo Collection Score → preview candidate; daily pick → wear confirmation; Scent Lab → save → post-wear feedback; mobile keyboard navigation.
- Fixtures: zero bottles, one bottle, 6 mixed bottles, 20 duplicate-heavy bottles, conflicting tags, all metadata missing, unknown weather, invalid IDs.
- Accessibility: usable labels, screen-reader score explanations, keyboard focus order, visible loading/error messages, motion-reduction support.
## 14. Delivery milestones and definition of done

| Milestone | Deliverable / exit gate |
|---|---|
| M0 · Repository audit | Inventory current stack/entities/components, migrations strategy, actual weather/AI sources; produce implementation plan; no broad rewrite |
| M1 · Shared profile adapter | Normalized fragrance profile mapper + fixtures + metadata confidence and tests |
| M2 · Collection Score | Score service, explainable UI, candidate preview, deterministic tests, demo flow |
| M3 · Daily Selector | Owned-only ranker, context form, fallback, feedback, tests |
| M4 · Scent Lab | Pair scoring, interactive workspace, persistence, feedback and tests |
| M5 · Polish / release | Analytics, responsive/accessibility checks, errors, tests green, README/case-study screenshots, live demo |

Definition of done: all must-have acceptance criteria pass, existing Sillage flows still work, no runtime secrets leak, README documents scoring assumptions and limitations, sample data is identifiable, user data is isolated, and feature demos are reachable in no more than three clicks from the homepage.

## 15. Claude Code execution instructions

Paste the following directive into Claude Code together with this document; attach it in the repository as /docs/PRD_Sillage_Collection_Intelligence.md if preferred.

```typescript
Read the attached Sillage Collection Intelligence PRD. FIRST inspect the existing repository
and write a brief architecture audit showing the real stack, current fragrance schema,
collection routes, auth/demo flow, AI/weather services, and reusable UI components.
Then propose a file-level implementation plan mapped to milestones M0–M5.
Implement incrementally, starting with M1 and M2. Do not rewrite existing features.
Use deterministic/versioned score calculations and test them before UI polish.
Reuse existing data and style conventions; introduce migrations only when needed.
For missing data or integrations, build transparent fallbacks rather than invented facts.
After each milestone, run applicable lint, typecheck, tests, and build; fix regressions.
Document modified files, key trade-offs, accepted limitations, and QA evidence.
Ask questions only for genuine blockers that cannot be resolved by repository inspection.

```

## 16. Open product decisions

- Confirm whether Sillage has user-level wear history; otherwise implement simple wear logging for selector feedback.
- Determine which fragrance metadata fields are actually reliable enough for season and occasion coverage; show confidence and provenance.
- Choose manual-only weather initially if existing app has no weather API; location permissions must remain optional.
- Define demo persistence (local, session, or disposable backend) based on existing deployment and public access.
- Validate category thresholds and weighting with qualitative tests instead of implying industry-validated scoring.
- Decide whether layering experiment feedback is visible only to its owner (recommended MVP).