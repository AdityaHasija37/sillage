# Sillage: case study

*How I scoped, built and shipped an AI fragrance advisor that can't make things up: what I decided, what evals and production changed, and what I'd do next.*

**Aditya Hasija · Product owner · 21–27 Oct 2026 · [Live demo](https://sillage-rosy.vercel.app) · [GitHub](https://github.com/AdityaHasija37/sillage)**

---

## TL;DR

- **Problem.** Collectors buy redundant or wrong bottles and wear the same few, and no tool connects decisions to what they already own. Chatbots invent products and prices.
- **What I built.** A shelf-first web app: Collection Score, a daily pick, a layering lab, explained recommendations, an exact-bottle price check, and one AI agent over all of it.
- **The judgment calls.** Code ranks and AI explains; grounding enforced in code; an eval suite written before tuning; a product decision where tuning would have hidden a trade-off; honest handling of weak data; a free, provider-neutral model.
- **Evidence.** 100% exact-match precision on 61 adversarial listings (from 83%), 0 of 7 planted fakes reached users, 119 / 62 / 14 unit, database-security and end-to-end tests, live on production.
- **Honest gap.** No real users yet. The next step is five interviews, not more features.

## Context and my role

A personal portfolio project, built in a week, with me as product owner and Claude Code as the engineer. I wrote and owned the product calls: problem framing, scope, data strategy under a zero-cost constraint, model and provider, trade-offs, and launch. The agent proposed defaults for everything else, and every decision was logged ([61 in the decision log](../DECISIONS.md)). Each stage ended with evidence (tests run, numbers measured, bugs written down) before the next began.

| Stage | Output |
|---|---|
| Spec | A seven-document spec pack (PRD, architecture, UX flows, QA plan, decisions) |
| v1 | Catalog, collection, recommendations, price check, advisor, public evals |
| v2 | [PRD 08](../specs/08_Collection_Intelligence_PRD.md): Collection Score, Today, Scent Lab; an editorial redesign |
| v2.1 | Free, provider-neutral AI; style and price-band filters |
| v2.2 | Live prices with trust signals; a [UX audit](../design/UX-AUDIT-2026-10.md) with 8 shipped fixes |

## The problem, and the bet

Fragrance people own a lot of bottles and still buy the wrong next one: another fresh blue scent when they have four, an EDT when they wanted the EDP, a "deal" that's a tester. And most of the shelf goes unworn. The tools don't connect: Fragrantica knows every perfume but not your shelf; a spreadsheet knows your shelf but suggests nothing; a chatbot will recommend confidently and invent a price.

> **The bet:** recommendations get far more relevant when they start from what you own and what you've said you like, and they're only trustworthy when every claim traces back to data.

One rule from the spec mattered more than I expected: **ownership isn't liking.** Each bottle counts by how you feel about it (love 1.0, like 0.7, neutral 0.2, unrated 0.15, and dislike counts against).

## The decisions I'd talk through in an interview

### 1. Code ranks, the AI explains

The obvious build was "LLM, recommend me a fragrance". I didn't build that. A tested engine scores every candidate on taste fit, the mode's goal, budget, season and time of day, and performance, and emits reason codes and caveats. The agent's job is to choose which tools to call and explain the result.

*Trade-off:* less conversational freedom, in exchange for answers that are reproducible, testable and explainable ("Why this rank" shows the breakdown). It also made the AI cheap to swap: when cost mattered, moving to a free model changed the voice, not the recommendations.

### 2. Grounding enforced in code, not asked for in a prompt

The agent cites fragrances by id. Before an answer reaches the user, any id that didn't come back from a tool in that turn, and any price that didn't appear in a tool result, is removed and counted in a trace shown under every answer. There's no write tool at all: saving is only ever *proposed*, and the user clicks to confirm, so a prompt injection hidden in review text has nothing to trigger. In the adversarial eval, **0 of 7** planted fakes got through.

### 3. Evals before tuning, and a failure I chose not to fix

I wrote the eval suite before tuning anything: 61 adversarial price listings, 30 synthetic personas across the three modes, adversarial model outputs, and catalog coverage, each with pass criteria written first. The first run was useful because it failed:

| Finding | What it meant | Change |
|---|---|---|
| "Khamrah **Qahwa**" matched as the same bottle as Khamrah | A flanker blocklist can never be complete | Matcher v2: an allowlist of words it understands; anything else needs verification. Precision **83% → 100%** |
| A La Vie Est Belle fan got two La Vie Est Belle flankers | "Similar" recommended the redundant purchase the product exists to prevent | Other versions of owned lines are flagged and down-weighted |
| In Fill gaps, a close match outscored a real gap | The PRD's starting weights didn't hold for this mode | Gap mode gets its own weights (25 / 35) |

Two personas still failed, and **I left them failing**. For a Tobacco Vanille lover, the engine preferred close alternatives from smaller houses over the famous names I'd annotated. That might be exactly what a value-minded collector wants, or it might cost trust. That's a product decision, not an eval to tune away. So users now choose whether to see **budget alternatives**, always labelled with what they resemble ([DEC-30](../DECISIONS.md)).

### 4. Honesty about weak data is the feature

The second PRD added a Collection Score, a daily pick and a layering lab. The hard part wasn't the maths; it was the data:

- The catalog has no occasion data, so occasion fit is *inferred* and labelled that way.
- A dimension with no data drops out and lowers confidence instead of scoring zero. The first test run caught that it didn't.
- Layering is a heuristic from an editable accord ruleset. It's called experimental and is never "high confidence"; the first calibration scored every pair 100 and was useless.

### 5. Free to run, without lowering the bar

A demo that costs money per question eventually gets switched off. Instead of picking a cheaper model and hoping, I made the agent provider-neutral: the loop, tools, grounding and trace don't know which model they're talking to. It runs on Gemini's free tier, with Claude one key away. The interesting work was making "free" reliable: Gemini's narrower tool schemas are generated from the Claude ones with the same validation underneath, and a quota error moves the answer to another free model rather than failing.

## What production taught me

Tests passed; production still had lessons. Every one is in the [build log](../evidence/BUILD-LOG.md).

| What happened | Fix |
|---|---|
| The default free model hung on every request; the "free" backup was closed to new accounts | A tested fallback chain of four free models, per-call timeouts, a 50 s budget |
| My first live test question hit the daily quota, because Today's AI sentence shared it | Separate light models for the sentence, its own rate limit; the answer restarts on the next model |
| "Winter fresh" returned vanilla bombs: a substring match let "fresh spicy" count as fresh | Styles map to whole accords that must lead the fragrance; price-band filter added |
| The first live price check hid **all 40** listings as unsafe: Google now sends links with raw spaces | URLs normalised before the safety check |
| The cheapest "exact match" was an eBay listing at ~40% of retail | "Unusually low price" and "Marketplace seller" flags: inform, don't hide |
| A new "show what was hidden" list revealed every rejection labelled "different fragrance" | The matcher compares the core name, so EDTs are rejected for the real reason |

The last one is my favourite: a transparency feature paid for itself within an hour by exposing my own bug.

## Design: from "looks AI-generated" to a product with a point of view

The first version worked but looked generic. I redesigned it as an editorial product (serif display type, paper and ink, drawn bottles that vary per fragrance) and made the agent's permissions visible on the landing page, the advisor page and How it works, because "what can the AI do to my data?" is the first question a careful user asks. A later [UX audit](../design/UX-AUDIT-2026-10.md) shipped eight fixes, led by answer-first layouts on phones and formatted advisor answers, and caught a demo bug that showed a wrong bottle as an exact price match.

## Results

| | Measured |
|---|---|
| Catalog | 38,365 fragrances; 20 / 20 common bottles found by name |
| Price matching (61 adversarial listings) | Precision **100%**, recall 100% (from 83%) |
| Recommendations (32 personas, criteria written first) | 29 / 32; exclusions honoured 100% |
| Fabrications reaching users (adversarial) | **0 / 7** |
| Collection Intelligence checks | 9 / 9 |
| Quality | 119 unit tests, 62 database-security assertions, 14 end-to-end tests including a WCAG 2.2 AA scan |
| Cost to run | $0 (free tiers throughout) |

What isn't measured yet: anything about real users. That's the next step.

## What I learned

- **Put the guarantees in code.** Every important promise (no invented products, no silent writes, honest prices) is enforced outside the model, so changing models didn't change the promises.
- **An eval that fails is the most useful kind.** The best product decision in the project came from a failure I chose to keep.
- **Transparency is a debugging tool.** Showing users what the system rejected surfaced a bug faster than any test I'd written.
- **"Free" is a reliability problem.** The model was easy; quotas, timeouts and closed endpoints were the work.

## What I'd do differently

- Interview five collectors **before** the second PRD. Collection Intelligence is my best guess at the daily-use loop, not a validated one.
- Instrument retailer clicks and preview → wishlist from day one; they're the clearest value signals.
- Run against live data (prices, the free model) earlier; four of the six production lessons would have surfaced a day sooner.

## What's next

1. **Five interviews** with 10+ bottle collectors: do they agree with their Score, would they open Today tomorrow, do they trust shelf-aware picks more?
2. **Live agent eval** and **50 labelled live price listings**, published on `/evals`.
3. Then, if the bet holds: collection import, streaming answers, and a wear calendar. See the [roadmap](ROADMAP.md).
