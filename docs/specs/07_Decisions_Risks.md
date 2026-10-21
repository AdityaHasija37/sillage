# 07 · Decision Register & Risk Log

*Assumptions, risks, trade-offs and change discipline*

Version 1.0 • 20 October 2026 • Status: build specification • Owner: independent portfolio project

Source of truth: this pack; if instructions conflict, record the decision in the Decision Register and update impacted documents. Assumptions are not verified production integrations.

## Decision log

| ID | Decision | Why / status |
|---|---|---|
| D-001 | Dashboard-first + optional AI advisor | Confirmed user preference |
| D-002 | Broad externally searchable catalog from launch | Confirmed; provider pending validation |
| D-003 | Five fragrances in activation acceptance | Confirmed user correction; not a hard gate |
| D-004 | One tool-using agent | Chosen MVP simplicity |
| D-005 | Variant-aware shopping search | Chosen for trustworthy comparisons |
| D-006 | No-signup recruiter demo | Chosen for portfolio accessibility |
| D-007 | No purchasing or alerts in MVP | Scope control |
| D-008 | Hybrid deterministic/AI recommendations | Chosen to improve auditability |

## Risk register

| Risk | Likelihood / impact | Mitigation |
|---|---|---|
| Catalog provider coverage/licensing | High / High | Vendor proof-of-concept; adapter; seed demo; document partial records |
| Shopping API cost/merchant coverage | High / High | API verification; bounded searches; partial results; mocks |
| Wrong EDT/EDP/size match | Medium / High | Exact variant gates and adversarial tests |
| Subjective performance/season claims | High / Medium | Label estimates/source and confidence; avoid fact language |
| AI hallucinated products/prices | Medium / High | Use catalog IDs, typed tools, reject freeform product facts |
| Guest demo abuse | Medium / Medium | Rate limits, quotas, deterministic cached demo scenarios |
| Unauthorized access | Medium / High | Supabase RLS, auth checks and security tests |
| Feature scope creep | High / Medium | P0 gates, explicit non-goals, decision register |

## Outstanding decisions before vendor integration

- Select catalog vendor after legally permitted test and record coverage of 20 common fragrances. 2. Select shopping API after checking at least two real retailers, exact variant handling, links and costs. 3. Document how verified vs subjective accords/performance are sourced. 4. Set cache expiration consistent with provider terms. 5. Pick demo strategy and implement disclosure. Block only dependent milestone, not earlier development.

## Change request template

ID, date, proposed change, user problem, options considered, impact on scope/cost/schedule/data/privacy, affected FR IDs, decision and owner. Update PRD, architecture, flow, tests and case study together.
