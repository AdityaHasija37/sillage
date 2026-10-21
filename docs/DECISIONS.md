# Decision Register

The spec pack says: when instructions conflict or are ambiguous, record the decision here and update the affected documents. Status: **Adopted** (spec default or owner call), **Proposed** (my default, open to change), **Open** (needs an owner answer).

## From the spec pack (adopted as written)

| ID | Decision | Source |
|---|---|---|
| D-001 | Dashboard-first, AI advisor optional | 07 Decision log |
| D-002 | Broad searchable catalog from launch, behind a replaceable adapter | 07 |
| D-003 | Five fragrances is the activation milestone, never a gate | 07, PRD |
| D-004 | One tool-using agent, no multi-agent orchestration | 07 |
| D-005 | Variant-aware shopping search | 07 |
| D-006 | No-signup recruiter demo | 07 |
| D-007 | No purchasing, alerts or affiliate links | 07 |
| D-008 | Hybrid: deterministic ranking, AI explanation | 07 |

## Owner decisions (21 Oct 2026)

| ID | Decision | Notes |
|---|---|---|
| DEC-01 | Same setup as Touchline: repo at `~/Desktop/sillage`, local Supabase in Docker for dev and tests, a second free hosted Supabase project plus Vercel at deploy, private 24 h demo sandboxes | Owner answer. Nothing is pushed or deployed without an explicit go-ahead |
| DEC-02 | Every data source must be **free** and must work without paid keys | Owner: "keep it free and make sure it works" |
| DEC-03 | **Catalog = the open Decant dataset** (a published dump of Fragrantica's public catalogue). Fragrances with ≥ 50 community votes are loaded: **38,365** | Owner wanted Fragrantica-quality data ("notes and reviews"). Resolves TDR-01. See DEC-04 and Q-04 for the licensing posture |
| DEC-12 | Advisor model: `claude-opus-5-5` by default, overridable with `ADVISOR_MODEL` | Owner said "same as before"; Touchline had no model, so the current default applies. One env var switches to `claude-sonnet-5-5` |

## Engineering and product decisions

| ID | Decision | Why |
|---|---|---|
| DEC-04 | The raw dump is **downloaded at build time and never committed**. Only facts and aggregates are kept: note pyramid with vote weights, accord strengths, rating, longevity, projection, season and day/night votes, have/want counts, up to 3 short review-theme labels each way with agree counts, and "smells like" links. Long descriptions and Fragrantica images are dropped. Every fragrance page links to its source page | Minimises what's republished; keeps attribution visible. Sillage never scraped anything |
| DEC-05 | Live catalog fallback: **Open Beauty Facts** (ODbL), queried only when the stored catalog returns fewer than 5 results on page 1, rate-limited, cached. Its records have no notes, so they're marked *unverified* and can be collected but not recommended | FR-02 "search beyond the seed" with an open, permitted source. Verified live: it returns real Dior Sauvage listings |
| DEC-06 | Fragella API not integrated | Its free tier is 20 requests/month, unusable for a public demo (DEC-02). The adapter interface leaves room for it |
| DEC-07 | **Price bands from a brand-tier map** (395 brands, each with band, tier and confidence), labelled "estimated from the brand's typical pricing" everywhere. 25,050 fragrances get a band; the rest say "price unknown" and the engine says so instead of guessing | The dataset has no prices but the budget filter (FR-06) needs one. Bands, not prices, avoid false precision |
| DEC-08 | Eligibility: ≥ 50 votes and rating ≥ 3.4. Candidate pool: the 3,000 most popular fragrances with ≥ 300 votes and rating ≥ 3.5, plus the community "smells like" neighbours of what the user owns. Tie-breaker ≤ 0.03 from a Bayesian-adjusted rating | Keeps recommendations to things with enough evidence. The tie-breaker can't override the PRD weights |
| DEC-09 | "Marketed for" (any / men / women) is an **explicit preference only**, never inferred from the collection | The first real-data run recommended a feminine gourmand to an all-masculine shelf; inferring gender from ownership would be presumptuous, so the user decides |
| DEC-10 | Sentiment weights: love 1.0, like 0.7, neutral 0.2, unrated 0.15, dislike −0.6 | PRD: ownership doesn't imply liking |
| DEC-11 | The service-role key is used for exactly four server-only jobs: caching shared catalog rows, caching offer snapshots, rate-limit counters, and creating demo sandboxes | Least privilege; user data is always read through the user's own RLS client |
| DEC-13 | **Advisor output contract**: fragrances are cited as `[[f:<id>]]`; every cited id must have been returned by a tool in that turn and every dollar amount must appear in a tool result. Violations are stripped before display and counted in the trace | PRD "zero fabricated product IDs/prices". Enforced in code, not just the prompt |
| DEC-14 | Fill gaps uses its own weights (preference 25, objective 35); Similar and Different keep the PRD's 35/25 | Eval and a unit test showed a close match to current taste outvoting a real gap. PRD says weights must be validated, not treated as truth |
| DEC-15 | Different mode excludes picks with ≥ 75% accord overlap with any owned bottle and rewards a family the user doesn't own; Fill gaps excludes ≥ 85% | "Different" must actually be different; a near-copy can't fill a gap. Eval D07 |
| DEC-16 | Other concentrations and flankers of an owned line are **flagged and down-weighted (×0.7), not excluded** | PRD job "avoid a redundant purchase", but some people want the EDP of the EDT they love. Eval S01/S03 |
| DEC-17 | Offer matcher v2: only recognised retail filler words may appear beyond the target's name; any unknown word sends the listing to *Needs verification* | v1's flanker blocklist let "Khamrah Qahwa" and "1 Million Lucky" through as exact (83% precision). v2: 100% on the same set |
| DEC-18 | Seasons and day/night come from community votes: a season "fits" at ≥ 60% of the top season's votes; day share ≥ 58% is daytime, ≤ 42% evening | Avoids presenting subjective suitability as fact; labelled "from community votes" |
| DEC-19 | Demo = **private seeded sandbox per visitor** (6 bottles across distinct styles with sentiments, 1 wishlist item, dislikes oud, $150 budget), deleted after 24 h; 5 per visitor per hour and 300 live overall | TDR-05. A shared demo account would expose visitors to each other's changes |
| DEC-20 | Variants: the user picks concentration and size; `ensure_variant()` (security definer, validated) creates the shared row. Sizes come from the source text when it states them ("available as 60 and 100 ml"), otherwise common sizes are offered with a note that not all may exist | TDR-03. A fragrance can be discovered before its size is known but not priced until it is |
| DEC-21 | No bottle photography: each fragrance is drawn as a "scent fingerprint" from its accords; accords are always listed in text too | No licensed images (UX doc); colour is never the only signal |
| DEC-22 | Review **themes** (AI summaries of Fragrantica reviews with agree/disagree counts) are shown, attributed. No user reviews are written or hosted in Sillage | Owner asked for review data; PRD non-goal is a community-review *feature*. Short labels, counts and attribution only |
| DEC-23 | Live offers: SerpApi Google Shopping when `SERPAPI_API_KEY` is set (free tier 250/month), cached 6 h, 12 checks per user per hour. Otherwise a sample provider with fictional merchants, no outbound links, and an explicit "not real prices" notice | TDR-02, TDR-04. Never presents samples as live retailer prices |
| DEC-24 | Advisor runtime: manual tool loop, ≤ 6 tool rounds, effort `low`, prompt caching on the frozen system prompt and tools, last 10 turns replayed **as plain text** (no thinking blocks), `fallbacks: "default"` for safety-classifier declines | Append-only history keeps the cache warm and avoids replaying thinking blocks after edits; bounded cost |
| DEC-25 | Without an API key, or when the model errors or declines, the advisor answers in **offline rule-based mode** with the same engine, clearly labelled | The demo never breaks and costs nothing by default |
| DEC-26 | Rate limits: chat 20/h per user, offers 12/h per user, live catalog 60/h per IP, demo 5/h per IP (override `DEMO_HOURLY_LIMIT` for local E2E only). Paid buckets fail closed | Public-demo cost control (PRD) |
| DEC-27 | Saved seasons and times of day are a soft context preference when a Discover request doesn't specify one | FR-04 lists "context" as a preference; without this the controls would do nothing |
| DEC-28 | Local ports moved to 553xx and the dev server to 3100 | Runs side by side with Touchline's local stack |
| DEC-30 | **Budget alternatives are the user's choice** (resolves Q-01): a fragrance is an "alternative to X" when the community strongly says it smells like X (≥ 50 votes, ≥ 70% agree) and X is in a higher price band (or X is $100+ and this brand's pricing is unknown). Included by default, always labelled "Budget alternative: N wearers say it smells like X", switchable in Discover, Preferences and the advisor ("no dupes") | Owner chose "let users choose". Turns an eval disagreement into a feature instead of tuning it away. 2,543 fragrances flagged; eval S11/S12 added for it |
| DEC-31 | Review themes stay on the public site, attributed (resolves Q-04) | Owner decision |
| DEC-32 | The near-duplicate diversity rule (≥ 95% accord similarity) applies within one brand only | So an original and its budget alternative can appear side by side; found by the Q-01 unit test |
| DEC-33 | Hosted auth: email confirmation **on** for real accounts (demo sandboxes skip it); Supabase's default confirmation and reset emails are kept, because custom templates need a custom SMTP provider on the free tier. Site URL `https://sillage-rosy.vercel.app` | Same posture as Touchline; free-tier constraint (DEC-02) |
| DEC-29 | Email confirmation is off locally; when sign-up returns a session the user goes straight to onboarding. Hosted setting: see Q-02 | Keeps E2E deterministic without Mailpit |

## Open (owner input needed)

| ID | Question | Status |
|---|---|---|
| Q-01 | Clones vs famous names in Similar | **Resolved** → DEC-30 |
| Q-02 | Deploy (public GitHub repo, hosted Supabase, Vercel) | **Done** 21 Oct 2026 → DEC-33 |
| Q-03 | Live advisor and live prices | **Approved**: owner adds `ANTHROPIC_API_KEY` and `SERPAPI_API_KEY` in Vercel |
| Q-04 | Review themes on a public site | **Resolved** → DEC-31 |

## Change log

| Date | Change |
|---|---|
| 21 Oct 2026 | Owner answers: Q-01 → DEC-30, Q-04 → DEC-31, Q-02/Q-03 approved. DEC-32 added |
| 21 Oct 2026 | Register created. DEC-01 to DEC-29; Q-01 to Q-04 |
