# 04 · Verification, QA & Requirements Traceability

*Executable-level acceptance checks, realistic fixtures, and evidence hygiene*

Version 1.0 • 20 October 2026 • Status: build specification • Owner: independent portfolio project

Source of truth: this pack; if instructions conflict, record the decision in the Decision Register and update impacted documents. Assumptions are not verified production integrations.

## Testing pyramid

Unit tests for identity normalization, variant matching, exclusions and scoring; service tests for provider adapters, API schemas, RLS and auth; end-to-end tests for guest demo and signed-in journeys; manual accessibility and mobile checks. Use Vitest and Playwright; Supabase local stack or mocks for predictable CI.

## Traceability matrix

| Requirement | Test IDs | Release evidence |
|---|---|---|
| FR-01 auth/demo | E2E-01,SEC-01 | demo URL + private RLS assertions |
| FR-02 catalog | CAT-01,CAT-02 | query beyond seed; pagination |
| FR-03 collection | COL-01,COL-02 | five distinct fragrance additions |
| FR-04 preferences | PRO-01 | data persists and overrides model inference |
| FR-05 dashboard | DASH-01 | aggregates agree with seeded data |
| FR-06 recommendations | REC-01..REC-05 | known fixtures and reason codes |
| FR-07 chat | AI-01..AI-03 | tool traces without secrets |
| FR-08 detail | DET-01 | provenance and variant accuracy |
| FR-09 wishlist | WISH-01 | persist and owned conversion |
| FR-10 offers | SHOP-01..SHOP-06 | exact match and error fixture |
| FR-11 feedback | FDBK-01 | positive/negative reaction persisted |
| FR-12 degraded states | ERR-01..ERR-04 | honest provider failure displays |
| FR-13 portfolio | DEMO-01..DEMO-03 | no-login walkthrough, public docs |

## Required unit test scenarios

REC-01 similar mode favors overlap with positively rated fragrance; REC-02 different mode avoids strongly overlapping owned family while preserving preferences; REC-03 gap mode identifies underrepresented category, does not invent shortage; REC-04 owned item excluded; REC-05 user-disliked note exclusion enforced. SHOP-01 exact brand/name/EDP/100mL accepted; SHOP-02 EDT rejected for EDP request; SHOP-03 50mL rejected for 100mL; SHOP-04 flanker edition rejected; SHOP-05 missing shipping disclosed; SHOP-06 duplicate merchant listings de-duplicated. CAT-02 provider outage returns fallback/error, not made-up items.

## Critical security test scenarios

SEC-01 user A cannot read user B collection via any service or DB; SEC-02 demo cannot write to production user; SEC-03 server API key not present in browser bundle; SEC-04 URL manipulation cannot alter offer destination to malicious scheme; SEC-05 malicious product description cannot induce tool writes or secret disclosure.

## E2E test paths

E2E-01: guest opens demo, views five+ sample fragrances, chooses Fill Gaps, sees grounded recommendation, opens exact variant and offer panel. E2E-02: new account adds five fragrances, sees accurate count, sets disliked oud note, requests Different, owns none of output candidates, saves wishlist, reloads and verifies persistence. E2E-03: simulates catalog and offer failures and still permits navigation/collection viewing.

## Release gates

Gate A: types/build/lint pass; Gate B: deterministic scoring and variant tests pass; Gate C: authenticated access and RLS pass; Gate D: entire demo walk-through is accessible publicly without signup; Gate E: shipping/size price caveats render correctly; Gate F: docs and known limitations match actual shipping features. Block release on any price fabrication, leakage, or false exact matching.

## Evaluation plan and metrics

Assemble >=30 anonymized synthetic recommendation cases across Similar/Different/Gap modes; manually annotate user preferences and acceptable outcomes before testing. Evaluate top-3 relevance, exclusion compliance, and factual grounding. Construct >=50 product-offer pairs with adversarial size/concentration/flanker differences; measure precision of exact match. Record timings/cost per AI request. These are planned evaluations, not delivered results.

## Evidence checklist

Save dated screenshots, short demo video, public deployment URL, commit hash, CI run, test count with raw output, provider coverage sample, known limitations, and actual user research notes. Never claim user impact, tests, or retailer breadth that have not been observed.
