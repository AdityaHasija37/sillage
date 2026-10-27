# Sillage PRD (living)

| | |
|---|---|
| **Owner** | Aditya Hasija (product) |
| **Status** | v2.2 shipped to production · pre-validation |
| **Last updated** | 27 Oct 2026 |
| **Supersedes** | The original [spec pack](../specs/README.md) (PRD 01–07, 20 Oct) and [PRD 08: Collection Intelligence](../specs/08_Collection_Intelligence_PRD.md) (22 Oct). They remain the record of what was asked for; this document is what the product is now. |
| **Related** | [One-pager](ONE-PAGER.md) · [Metrics](METRICS.md) · [Roadmap](ROADMAP.md) · [Agent design](../design/AGENT-DESIGN.md) · [Decision log](../DECISIONS.md) · [Traceability](../TRACEABILITY.md) |

## 1. Summary

Sillage is a responsive web app for fragrance enthusiasts that starts from what they own. It helps with three recurring decisions: **what to buy next**, **what to wear today**, and **where to buy the exact bottle**. It does this with deterministic, tested engines and one AI agent that plans, calls those engines as tools, and explains, under a grounding check that removes anything a tool didn't return.

## 2. Problem and opportunity

- **Redundant and wrong purchases.** Collectors buy near-duplicates and wrong variants because no tool connects a candidate to their shelf.
- **Underused collections.** People rotate a few favourites; the rest of a costly collection sits idle.
- **Untrustworthy prices.** Testers, flankers, wrong sizes and fakes look like deals.
- **AI that can't be trusted here.** Chatbots don't know the shelf and invent products and prices.

**Why now:** open community data (38k fragrances with notes, accords and votes) and cheap tool-using models make a shelf-aware, grounded assistant possible at near-zero cost.

## 3. Goals and non-goals

**Goals**

1. A visitor understands the value within two minutes, without signing up.
2. Every recommendation, score and pick is explainable and reproducible.
3. No fabricated product, price or claim reaches a user.
4. The product runs at zero marginal cost on free tiers.

**Non-goals (v2)**

Community reviews or social features · photo recognition · checkout or order placement · price-history alerts · affiliate revenue · AI-generated perfumery facts · multi-agent orchestration · native apps.

## 4. Users

| Persona | Shelf | Primary job | Served by |
|---|---|---|---|
| **Engaged enthusiast** (primary) | 10–50 | "Does this add something, or repeat what I own?" | Score preview, Discover, Price check |
| Casual collector | 5–10 | "What should I wear today?" | Today, Shelf |
| Newcomer | 0–4 | "Where do I start?" | Discover; provisional Score |

Full jobs to be done: [one-pager](ONE-PAGER.md#jobs-to-be-done).

## 5. Product principles

1. **Start from the shelf.** Ownership and sentiment shape every result. Ownership isn't liking.
2. **Code decides, AI explains.** Ranking, scoring and matching are deterministic and versioned; the model never ranks.
3. **Show the work.** Reasons, caveats, score breakdowns, tool traces and rejected listings are visible or one tap away.
4. **Estimates are labelled.** Community votes, inferred fields and price bands always say so.
5. **No silent writes.** The AI can only propose; the user confirms.
6. **Fail honestly.** Without a model, data or quota, say so and fall back to something useful.

## 6. Scope and status

| Area | Capability | Priority | Status | Shipped |
|---|---|---|---|---|
| Access | Email auth; private demo sandbox without sign-up (24 h) | P0 | ✅ | v1 |
| Catalog | 38k-fragrance search with typo tolerance, exact variant selection, live fallback | P0 | ✅ | v1 |
| Collection | Owned list with rating and sentiment; wishlist; preferences | P0 | ✅ | v1 |
| Shelf | Family mix, season × time coverage, signature accords | P0 | ✅ | v1 |
| Discover | Similar / Different / Fill gaps; price-band and style filters | P0 | ✅ | v1 · v2.1 |
| Collection Score | Five dimensions, strengths, gaps, candidate preview | P0 | ✅ | v2 |
| Today | Owned-only daily pick with weather, feedback and rotation | P1 | ✅ | v2 |
| Scent Lab | Pair prediction, notebook, wear log, suggested pairings | P1 | ✅ | v2 · v2.2 |
| Price check | Exact-variant matching, live offers, trust flags, hidden-listing list | P0 | ✅ | v1 · v2.2 |
| AI advisor | One agent, ten tools, grounding, model fallback, offline mode | P0 | ✅ | v1 · v2.1 |
| Evals | Public eval page and versioned history | P0 | ✅ | v1 |

## 7. Requirements

Each requirement maps to code and tests in [TRACEABILITY.md](../TRACEABILITY.md).

### 7.1 Core (from PRD 01)

| ID | Requirement | Acceptance | Status |
|---|---|---|---|
| FR-01 | Email auth; demo without sign-in | A visitor opens a private, seeded sandbox in one click; it deletes itself after 24 h | ✅ |
| FR-02 | Search a broad catalog; choose the exact variant | Common bottles found by name (20 / 20 in evals); concentration and size selectable | ✅ |
| FR-03 | Add and remove owned bottles with rating and sentiment | Duplicates prevented; sentiment weights the profile | ✅ |
| FR-04 | Preferences: notes to seek or avoid, budget, context, performance | Avoided notes are hard exclusions, even when note data is missing | ✅ |
| FR-05 | Shelf: count, family mix, season and occasion coverage | Renders for 0–50 bottles with empty and partial states | ✅ |
| FR-06 | Similar, Different, Fill gaps with ranked suggestions | Owned and near-copies excluded; every pick has reasons and caveats | ✅ |
| FR-07 | Optional AI chat over the user's own data via safe tools | See 7.4 | ✅ |
| FR-08 | Detail page with sourced notes, accords and data completeness | Every page links to its source | ✅ |
| FR-09 | Wishlist add, remove, move to owned | Persisted per user (RLS) | ✅ |
| FR-10 | On-demand, variant-aware price search with attribution | See 7.3 | ✅ |
| FR-11 | Relevant / not-relevant feedback | Stored against the recommendation run | ✅ |
| FR-12 | Partial results and safe error states | Every external dependency has a labelled fallback | ✅ |

### 7.2 Collection Intelligence (from PRD 08)

| ID | Requirement | Status |
|---|---|---|
| CS-01–07 | **Collection Score**: deterministic and versioned (`score-1.0`); five dimensions 0–100 with renormalised weights when data is missing; duplicates add nothing; preview never mutates the shelf; strengths, gaps, methodology and completeness exposed; demo visitors can preview without signing up | ✅ 21 acceptance tests |
| DS-01–07 | **Today**: owned bottles only, honouring "not today"; manual weather works without location; re-ranks without reload; top three unique with 2+ grounded factors; idempotent, user-scoped feedback; helpful empty state; factor breakdown and confidence visible | ✅ |
| SL-01–07 | **Scent Lab**: owned bottles only, never the same twice; A/B and B/A identical; uncertain claims labelled; saved pairs persist; logging a result never changes the prediction; feedback personalises within ±10; missing data gives an honest "insufficient information" | ✅ |

### 7.3 Price check

| ID | Requirement | Acceptance | Status |
|---|---|---|---|
| PC-01 | "Exact" only when brand, name, concentration and size match and it's a new full bottle | ≥ 95% precision on the adversarial fixture (measured **100%**, recall 100%) | ✅ |
| PC-02 | Rank by landed cost only when every exact offer states shipping; otherwise by listed price, and say so | Disclosed on the page | ✅ |
| PC-03 | Never claim complete coverage or "cheapest anywhere" | Copy review; agent prompt and grounding | ✅ |
| PC-04 | Flag offers under 65% of the typical price, and marketplace sellers; never hide them | Unit-tested thresholds; flags reach the advisor | ✅ v2.2 |
| PC-05 | Show every rejected listing and the reason, without links | "Show them" list | ✅ v2.2 |
| PC-06 | Without a live key, show clearly labelled sample offers from fictional stores, with no links | Labelled notice | ✅ |

### 7.4 AI advisor

| ID | Requirement | Status |
|---|---|---|
| AI-01 | Recommends only fragrances returned by a tool this turn; ids it didn't get are removed and counted | ✅ 0 / 7 planted fakes reached users |
| AI-02 | Quotes only prices a tool returned; price bands called estimates; price warnings repeated | ✅ |
| AI-03 | Saves nothing: wishlist and preference changes are proposed and confirmed by the user | ✅ |
| AI-04 | Third-party text is labelled untrusted data, never instructions | ✅ |
| AI-05 | Bounded: ≤ 6 tool rounds, 50 s budget, per-user rate limits | ✅ |
| AI-06 | Provider-neutral (Gemini free tier or Claude); overload, quota or timeout moves to the next free model | ✅ v2.1 |
| AI-07 | With no model, answers from the same engines in a labelled rule-based mode | ✅ |
| AI-08 | Every answer shows its tool calls, model, latency, tokens and grounding result | ✅ |

## 8. Non-functional requirements

| Area | Requirement |
|---|---|
| **Privacy** | No location or weather stored; coordinates rounded. Analytics are an insert-only allowlist with no free text. The privacy page names the AI provider and the free tier's data use. |
| **Security** | Row-level security on every user table (62 pgTAP assertions). No server secret in the browser bundle (checked on every build). Rate limits fail closed on paid or quota-bound calls. |
| **Accessibility** | WCAG 2.2 AA: automated axe scan on every app screen, keyboard-only flow tested, reduced-motion respected. |
| **Performance** | Engines respond in ~10–15 ms over 3,000 candidates. Advisor answers in 6–25 s on the free model, with staged progress shown. |
| **Cost** | Zero marginal cost: free tiers for hosting, database, model (Gemini) and prices (SerpApi, 250 / month); 6 h offer caching. |
| **Reliability** | Every external dependency (model, prices, catalog fallback, weather) has a labelled fallback. |

## 9. Success metrics

North Star: **weekly active collectors who complete a decision** (log a wear, preview a purchase, or check a price). Inputs, guardrails, definitions and instrumentation: [METRICS.md](METRICS.md).

## 10. Release history

| Version | Date | What shipped |
|---|---|---|
| v1 | 21 Oct 2026 | Catalog, collection, shelf, Discover, detail, price check, advisor, evals, demo sandbox |
| v2 | 22 Oct | Collection Score, Today, Scent Lab (PRD 08); editorial redesign |
| v2.1 | 26 Oct | Provider-neutral advisor on Gemini's free tier; price-band and style filters |
| v2.2 | 27 Oct | Live prices, trust flags, hidden-listing list; UX audit (8 fixes) |

## 11. Risks and dependencies

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| The core bet doesn't hold with real users | Medium | High | Five interviews next; preview → wishlist as the first value metric |
| Community data quality | High | Medium | Labelled estimates; confidence reflects completeness |
| Free model latency and quota | High | Medium | Fallback chain, 50 s budget, rule-based mode |
| Google Shopping format changes | Medium | Medium | URL normalisation, hidden-listing list exposes matcher drift |
| Dataset licence or availability | Low | High | Facts and aggregates only, source links, nothing committed |

## 12. Open questions

| Question | How we'll answer it |
|---|---|
| Do collectors trust shelf-aware picks more than generic ones? | Interviews; preview → wishlist rate |
| Is the Collection Score meaningful, or just interesting? | Interviews: do people agree with their score and act on gaps? |
| Would people use Today daily? | 2-week cohort: wears logged in two or more weeks |
| Famous originals or close budget alternatives by default? | Currently the user's choice (DEC-30); revisit with interview data |

## 13. Appendix: source specs

The build was checked against a seven-document spec pack and PRD 08, kept unchanged in [docs/specs](../specs/README.md). Deviations are recorded in the [decision log](../DECISIONS.md).
