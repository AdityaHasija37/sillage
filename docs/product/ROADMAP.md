# Roadmap

*Now / Next / Later, with the reason for each and what would change the plan. Updated 27 Oct 2026.*

The product is built and live; what it lacks is evidence. So **Now is about learning**, not features.

## Now: validate the bet (next 2 weeks)

| Item | Why | Done when |
|---|---|---|
| **Five collector interviews** | The core bet (shelf-aware beats generic) is untested | Notes from five sessions with 10+ bottle owners; a written readout of what to keep, change or cut |
| **Live agent eval** | The agent passes adversarial tests; real-prompt quality on the free model isn't measured yet | Eight prompts with expectations written first, published on `/evals` |
| **Label 50 live price listings** | 100% precision is on synthetic listings; real ones are messier | Precision and recall on live data in the eval report |
| **Finish instrumentation** | Retailer clicks and preview → wishlist attribution are missing | Events in the allowlist; a first query for each input metric |

## Next: deepen the two loops (weeks 3–8, if the bet holds)

| Item | Why | Signal that triggers it |
|---|---|---|
| **Import a collection** (CSV, or a pasted Fragrantica list) | Adding 20 bottles by hand is the biggest activation hurdle | Interviewees with 20+ bottles stall in onboarding |
| **Streaming advisor answers** | 6–25 s waits hurt; streaming makes progress real, not staged | Fallback or abandonment during waits in the cohort |
| **Wear calendar and gentle rotation nudges** | Turns Today into a habit and surfaces forgotten bottles | Wear habit ≥ 15% in the first cohort |
| **"Should I buy this?" from any page** | Puts the Score preview where purchase intent happens (detail pages, Discover, advisor) | Preview → wishlist ≥ 10% |
| **Price alerts for wishlist bottles** (exact variant) | The natural follow-up to a trustworthy price check | Retailer clicks from price checks are a meaningful share of sessions |

## Later: only with evidence

| Item | Why it waits |
|---|---|
| Shared shelves and friends' picks | Social features dilute the core loop until it's proven |
| Photo recognition to add bottles | Expensive; import may solve the same problem |
| Multi-currency and regional prices | The US first; expand with demand |
| Affiliate revenue | Must never bias rankings; needs a clear separation design first |
| Native apps | The responsive web app covers the use cases today |

## What would change the plan

- **Interviews say the Score is "interesting but not useful"** → simplify it into the purchase preview and drop it from the Shelf.
- **People love Today but ignore purchase help** → shift the product toward wearing what you own (wear calendar, rotation) and away from buying.
- **Live price precision drops below 90%** → pause price features and fix the matcher before anything else; trust is the brand.
