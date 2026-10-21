# Sillage: a case study

*How I scoped and built an AI fragrance advisor that can't make things up, and how evals changed the product.*

## The thesis

Fragrance people own a lot of bottles and still buy the wrong next one: another fresh blue scent when they already have four, an EDT when they wanted the EDP, a "deal" that turns out to be a tester. The tools they use don't connect. Fragrantica knows every perfume but not your shelf. A spreadsheet knows your shelf but suggests nothing. A chatbot will happily recommend things, but it doesn't know what you own and will invent a price if you ask.

**The bet: recommendations get much more relevant once they start from what you own and what you've said you like, and they're only trustworthy if every claim can be traced to data.** That's a hypothesis. I haven't run user interviews; the evals described below test that the system behaves as specified, not that people want it.

## Who it's for

Casual-to-engaged enthusiasts with roughly 5–50 bottles. Three jobs from the PRD shaped everything:

1. *Show me what I own and what it says about my taste.*
2. *Recommend something similar, or intentionally different, and don't make me buy something I effectively already have.*
3. *Find a trustworthy price for the exact bottle without opening five stores.*

One rule from the PRD turned out to matter more than I expected: **ownership isn't liking.** Plenty of people own bottles they regret. So Sillage weights each bottle by how you feel about it (love 1.0, like 0.7, neutral 0.2, unrated 0.15, dislike counts against), and the dashboard nudges you to rate.

## The decisions I'd talk through in an interview

The [decision register](../DECISIONS.md) has 33 entries, including how each open question was resolved. These are the ones that shaped the product.

**1. Deterministic ranking, AI explanation (Decision B).** The obvious build was "LLM, recommend me a fragrance." I didn't do that. A tested engine scores every candidate on five components (taste fit, the mode's goal, budget, season and time of day, performance) and emits reason codes and caveats. The Claude agent's job is to call that engine and explain the result. *Trade-off:* less conversational flexibility, in exchange for answers that are reproducible, testable and explainable ("Why this rank" shows the score breakdown).

**2. An output contract enforced in code, not in the prompt.** The agent must cite fragrances by id. Before an answer reaches the user, any id that didn't come back from a tool in that turn, and any dollar amount that didn't appear in a tool result, is stripped and counted. Every answer carries an inspectable trace: tool calls, latency, tokens, estimated cost, grounding result. In the eval, 0 of 7 planted fabrications got through.

**3. Writes need a human click.** The agent has two "propose" tools (wishlist, preference change) that save nothing. They return a confirm button. There's no write path for a prompt injection hidden in third-party text to trigger, and the review themes it reads are labelled untrusted in the tool output.

**4. One agent, eight tools, and a fallback (D-004).** No multi-agent orchestration: this job doesn't need it, and one agent with typed tools is easier to test and cheaper to run. When there's no API key, or the model errors or declines, a rule-based mode answers with the same engine and says so. The public demo never breaks and costs nothing by default.

**5. Exact-variant price matching (Decision D).** A listing is an exact match only if brand, line, concentration and size agree and it's a new full bottle. Everything else is rejected or marked "needs verification", and the UI says what was hidden and why. Totals are compared only when every exact offer states shipping. Without a live key, offers are clearly labelled samples from fictional stores, with no links. Sillage never claims "cheapest anywhere."

**6. Free, open data that actually works (Decision A).** The owner constraint was "free, and make sure it works." I evaluated the options: the only real fragrance API had a 20-request free tier; Fragrantica has no API and its terms forbid scraping. I used a published open dump of Fragrantica's catalogue (Decant), downloaded at build time and never committed, keeping only facts and aggregates and linking every page back to its source. That gives 38,365 fragrances with weighted notes, accords, ratings, longevity, season votes and community "smells like" links. Open Beauty Facts covers searches the dataset misses. The dataset has no prices, so the budget filter uses estimated price bands from a 395-brand tier map, always labelled as estimates.

**7. A demo that's a sandbox, not a shared login (D-006).** "Try the demo" creates a private account with six bottles across distinct styles, a wishlist item and a preference ("avoids oud"), and deletes it after 24 hours.

## Evals changed the product

I wrote the eval suite before tuning anything, with criteria annotated ahead of the first run: 61 adversarial offer listings, 30 synthetic personas across the three modes, adversarial agent outputs, and catalog coverage. The [public evals page](../evals/REPORT.md) shows every case.

The first run was useful precisely because it failed:

| Finding | What it meant | Change |
|---|---|---|
| "Lattafa Khamrah **Qahwa**" and "1 Million **Lucky**" matched as exact | A blocklist of flanker words can never be complete | Matcher v2 trusts only words it recognises; anything else goes to "Needs verification". Precision 83% → **100%** |
| A La Vie Est Belle fan got two La Vie Est Belle flankers | "Similar" was recommending the redundant purchase the PRD exists to prevent | Other versions of owned lines are flagged and down-weighted, not hidden (some people do want the EDP) |
| An all-amber shelf got an amber pick in "Different" | Accord distance alone isn't "different" | Reward a family the user doesn't own; exclude near-copies (≥ 75% overlap) |
| In "Fill gaps", a close match to existing taste outscored a real gap | The PRD's starting weights (35/25) didn't hold for this mode | Gap mode gets its own weights (25/35). The PRD said to validate weights empirically, and this was that |

A unit test caught a related one: the "Fill gaps" bridge term rewarded a 97%-identical scent. And a data query found two well-reviewed fragrances with no note data at all, which a "never oud" preference couldn't be checked against, so they're now excluded whenever a user avoids any note.

Two personas still failed, and I left them failing. For a Tobacco Vanille lover and a La Vie Est Belle lover, the engine preferred close alternatives from smaller houses (Maison Alhambra, La Rive) over the famous names I annotated. That might be exactly what a value-minded enthusiast wants, or it might cost trust. **That's a product decision, not an eval to tune away**, so I took it to the owner, who chose to let users decide. v3 labels "budget alternatives" (a strong community "smells like" link to something in a higher price band; 2,543 fragrances), includes them by default, and adds a switch in Discover, Preferences and the advisor ("no dupes"). Two new eval cases, written before running, cover it; the famous-name annotations still fail honestly, because with alternatives off the engine picks niche originals, not household names.

## Working with an AI engineer

I worked as product owner with Claude Code as the engineer, from a seven-document spec pack. I made the calls that were mine (data source, budget constraints, model, deploy setup); it proposed defaults for the rest and logged each one. The useful habit was the same as on Touchline: no claim without evidence. Tests run, numbers measured, bugs written down in the [build log](../evidence/BUILD-LOG.md), including the ones testing caught.

## What's next

1. **Five user interviews** with collectors who own 10+ bottles: does starting from the shelf actually change which suggestions they trust? Show them the clone-vs-famous results (open question Q-01).
2. **Live agent eval** once an API key is configured: grounding rate, latency and cost per answer on 20 real prompts.
3. **Real offer sample:** label 50 live SerpApi results to measure precision on messy real listings, not just synthetic ones.
4. Instrument time-to-first-five-bottles and Discover → wishlist conversion.

## Status

An MVP portfolio project. Built and tested locally (54 unit tests, 38 database security assertions, 11 end-to-end tests including an automated WCAG 2.2 AA scan, and the eval suite). Live at [sillage-rosy.vercel.app](https://sillage-rosy.vercel.app) on free tiers; see the README for honest caveats.
