# Sillage: one-pager

*Product brief · Owner: Aditya Hasija · Status: live MVP, pre-validation · Updated 27 Oct 2026*

**Live:** [sillage-rosy.vercel.app](https://sillage-rosy.vercel.app) · **Deeper:** [PRD](PRD.md) · [Case study](CASE-STUDY.md) · [Metrics](METRICS.md) · [Roadmap](ROADMAP.md)

## The problem

Fragrance enthusiasts with 5–50 bottles make two decisions over and over, and both are poorly served:

1. **Which bottle to buy next.** People buy near-duplicates of what they own (the fifth fresh blue scent), the wrong variant (EDT instead of EDP), or a "deal" that's a tester or a fake. Research means Fragrantica, YouTube, Reddit and five store tabs, none of which know their shelf.
2. **Which bottle to wear today.** Most collectors rotate a few favourites and forget the rest, so a costly collection goes unused.

General-purpose chatbots are confident here but don't know what you own and will invent prices. Spreadsheets know what you own but suggest nothing.

## Who it's for

| Segment | Size of shelf | What they want | Fit |
|---|---|---|---|
| **Engaged enthusiast** (primary) | 10–50 bottles | Fewer redundant purchases, more use of what they own | Core |
| Casual collector | 5–10 | Help choosing what to wear, guidance on a first "different" bottle | Strong |
| Newcomer | 0–4 | Where to start | Served by Discover; Score is provisional below 3 bottles |

## Jobs to be done

- *When I'm thinking about buying a fragrance, help me see whether it adds something or repeats what I own,* so I don't waste money.
- *When I'm getting ready, pick something from my shelf for the occasion and weather,* so my collection gets worn.
- *When I've decided on a bottle, find a trustworthy price for that exact bottle,* so I don't buy a tester or a fake.
- *When I'm curious, tell me how two of my bottles might layer,* so I can experiment with what I have.

## The bet

> Recommendations get far more relevant when they start from what you own and what you've said you like, and they're only trustworthy when every claim traces back to data.

This is a hypothesis. No real users have tested it yet; the first roadmap item is five interviews.

## The solution

| Capability | What it does | Why it's trustworthy |
|---|---|---|
| **Shelf & taste profile** | Collection, family mix, season/time coverage, signature accords weighted by how much you like each bottle | Ownership isn't liking: disliked bottles count against the profile |
| **Collection Score** | 0–100 across season, occasion, versatility, diversity, redundancy, with a fix for each gap; preview any bottle before buying | Missing data lowers confidence instead of scoring zero; weights are shown |
| **Today** | Ranks only bottles you own for the occasion and weather; learns from "Wore this" | Feedback adjusts picks within bounds; location is opt-in and never stored |
| **Discover** | Similar, Different or Fill gaps, with reasons, caveats and a score breakdown | Deterministic, versioned engine; no AI in the ranking |
| **Scent Lab** | Predicts how two owned bottles might layer; you log what really happened | Labelled experimental; confidence is never "high" |
| **Price check** | Offers for the exact concentration and size; flags suspiciously cheap and marketplace offers; shows what was hidden and why | 100% precision on 61 adversarial listings; never claims "cheapest anywhere" |
| **AI advisor** | Plain-English questions answered by an agent that calls the tools above | Grounding check removes anything a tool didn't return; writes need a click |

## What's different

- **Starts from the shelf.** Every feature reads what you own and how you feel about it. Competitors start from a catalog or a chat box.
- **Agentic, but constrained.** One agent with typed tools over tested engines, rather than a model that ranks or a multi-agent system. Every answer shows its trace.
- **Honest about uncertainty.** Estimates are labelled, gaps in the data are visible, and the price check shows what it rejected.

## How we'll know it's working

| Type | Metric | Hypothesis target (pre-validation) |
|---|---|---|
| **North Star** | Weekly active collectors who complete a decision (log a wear, preview a purchase, or check a price) | Grows with retention, not with sign-ups |
| Activation | New users who add 5+ bottles in their first session | ≥ 60% |
| Engagement | Users who log a wear in Today in at least 2 different weeks of their first month | ≥ 30% |
| Value | Pre-purchase previews that end in a wishlist save | ≥ 20% |
| Trust (guardrail) | Advisor answers where the grounding check removed something | ≤ 5%, and trending down |
| Quality (guardrail) | Exact-match precision on labelled live listings | ≥ 95% |

Instrumentation and definitions: [METRICS.md](METRICS.md).

## Risks and how they're handled

| Risk | Mitigation |
|---|---|
| The bet is wrong: shelf-aware recommendations don't change what people trust or buy | Five interviews before more features; measure preview → wishlist |
| Community data is noisy or missing | Estimates labelled; confidence drops with missing data; low-vote items flagged |
| AI fabricates products or prices | Grounding enforced in code; 0 / 7 planted fakes got through in evals |
| Free AI tier is slow or rate-limited | Model fallback chain; labelled rule-based mode; 50 s budget |
| Fakes and grey-market offers | Exact-variant matching, low-price and marketplace flags, no affiliate incentive |

## Non-goals (for now)

Community reviews, social feeds, photo recognition, checkout, price-history alerts, affiliate revenue, multi-agent orchestration, and native mobile apps.
