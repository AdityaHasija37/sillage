# 01 · Product Requirements Document

*Vision, personas, MVP boundaries, requirements and measurable outcomes*

Version 1.0 • 20 October 2026 • Status: build specification • Owner: independent portfolio project

Source of truth: this pack; if instructions conflict, record the decision in the Decision Register and update impacted documents. Assumptions are not verified production integrations.

## Executive summary

Sillage is a responsive fragrance collection manager, personalized discovery advisor and retailer-price comparison experience. Users maintain an owned collection and wishlist, learn their scent profile, ask a contextual AI advisor for recommendations, and review matching seller offers. The product is a public portfolio artifact: an unauthenticated guided demo must show its central value within two minutes.

## Problem, audience and jobs to be done

Primary audience: casual-to-engaged fragrance enthusiasts with 5–50 bottles; secondary: curious newcomers seeking structured recommendations. Jobs: “Show me what I own and what it says about my taste”; “Recommend something similar or intentionally different”; “Avoid a redundant purchase”; “Find a trustworthy comparable offer without manually opening five stores.” Ownership does not imply liking; users must express likes/dislikes explicitly.

## Positioning and differentiation

Unlike a generic fragrance search engine or chatbot, Sillage uses persistent ownership and explicit preferences; unlike a static spreadsheet, it connects collection analysis to a guided next-purchase decision; unlike a pure shopping site, it explains why a fragrance fits before showing prices. Product copy must not claim expert-level olfactory accuracy or comprehensive price coverage.

## Core user stories and priorities

| ID | Priority | User story / capability |
|---|---|---|
| FR-01 | P0 | Authenticate by email; optional demo without sign-in |
| FR-02 | P0 | Search broad external catalog by brand/name; choose exact variant |
| FR-03 | P0 | Add/remove owned fragrances, save personal rating and liking |
| FR-04 | P0 | Edit preferences: notes to seek/avoid, budget, context, performance |
| FR-05 | P0 | Dashboard: count, family distribution, season/occasion coverage |
| FR-06 | P0 | Choose similar, explore different, or fill gaps; get ranked suggestions |
| FR-07 | P0 | Optional AI chat can use profile and collection via safe tools |
| FR-08 | P0 | Fragrance detail with sourced notes, accords and data-completeness |
| FR-09 | P0 | Wishlist add/remove and move to owned list |
| FR-10 | P0 | On-demand price search with variants and seller attribution |
| FR-11 | P1 | Relevant/not relevant recommendation feedback |
| FR-12 | P0 | Visible partial results and safe error states |
| FR-13 | P0 | Public portfolio demo and links to GitHub/docs |

## Collection & onboarding rules

Activation criterion: a new user can add at least FIVE fragrances to their collection (not six). There is no required minimum to enter the dashboard; it displays helpful empty and partial states. Users may also record zero-to-five while onboarding. Each owned item references a canonical fragrance record and optionally a chosen variant; duplicates are prevented per user/variant unless differentiated bottle ownership is intentionally added later.

## Personalized recommendation behavior

Three explicit modes: Similar (favor overlap with liked fragrances), Different (favor novelty while retaining preference fit), Fill Gaps (favor underrepresented families/seasons/occasions). Candidate retrieval and eligibility are deterministic; LLM explains grounded candidates but cannot invent catalog records. Remove already-owned matches, respect explicitly disliked notes, budget constraints and requested season/occasion. Highlight overlap with owned bottles and uncertainty due to missing data. Initial score proposal: preference 35%, objective/novelty 25%, budget 20%, season/occasion 10%, performance 10%; validate empirically rather than treating weights as truth.

## Price comparison behavior

Search offers on demand only; show target retailer coverage as aspirational (FragranceNet, FragranceX, Jomashop, Walmart, Amazon), not guaranteed. Match brand, canonical fragrance, exact concentration, size, edition, condition, seller and currency where provided. Rank by landed cost only where shipping and tax are sufficiently available; otherwise rank by clearly labeled listed price and disclose omissions. Include last checked time and link; never claim all stores checked when they were not. Do not place orders or affiliate claims in MVP.

## User-facing screens

Landing and demo entry; authentication; onboarding; dashboard; collection grid/list; catalog search and fragrance detail; preferences; recommendation results; AI advisor panel; wishlist; offer comparison; settings; demo explainer and case-study link. Mobile responsive for major use paths.

## Quality, privacy and accessibility

Never expose API keys to browser. Row-level security for user-owned data; demo data isolated and immutable. Inform users that AI text is generated; enable error correction. Use accessible labels, keyboard navigation, legible contrast, responsive layout and reduced-motion preferences. Keep price/search costs controlled with rate limits and short-lived caching.

## Success & evaluation

Acceptance: user adds >=5 owned fragrances; external catalog search works beyond local seed; sees grounded summaries; completes each discovery mode; requests chat based on actual profile; saves wishlist item; checks clearly matched offers or sees honest unavailable message. Evaluation targets (not claims of achieved results): 95%+ exact-variant match on an annotated offer fixture; zero fabricated product IDs/prices in tests; user can complete demo path in <2 minutes; functional flow passes desktop/mobile checks. Report actual measured outcomes later.

## Non-goals / deferred

No community reviews, social feeds, photo recognition, buying automation, push alerts, price history charts, affiliate payout flow, AI-generated perfumery facts, crowdsourced note database, multi-agent orchestration, or subscription management in v1.
