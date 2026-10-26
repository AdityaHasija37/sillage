# Build log

What was built, in order, and what testing caught along the way. Dates are 21 Oct 2026.

## 1. Data source decision
- Evaluated Fragella (20 free requests/month: unusable), Noteboxd/scentrev (too new), Fragrantica (no API; terms forbid scraping), Open Beauty Facts (open, but no notes).
- Owner asked for Fragrantica-quality data for free. Found the open Decant dump: 57,273 perfumes; kept the 38,365 with ≥ 50 votes. Build: ~2 s; load into Postgres: ~10 s; 90 MB.
- Fuzzy search verified: "tobaco vanile" → Tom Ford Tobacco Vanille, 3–7 ms locally.

## 2. Foundation
- Schema with RLS on every user table; catalog and offers public-read, server-written.
- Bug: `similar` is a reserved word in Postgres → column renamed `similar_to`.
- Bug: `node:sqlite` finalised statements when a database handle was garbage-collected mid-build → handles kept alive and closed explicitly.

## 3. Recommendation engine
- First unit run: 2 failures, both real design flaws, not test errors:
  - Different mode let a near-clone of an owned bottle into the top 3 (preference and novelty pull in opposite directions) → near-copies excluded.
  - With 4 bottles, every missing family was a "gap" (REC-03's invented shortage) → family gaps need ≥ 5 bottles.
- Debug output then showed a flat penalty collapsing every Different candidate to the same score → Different uses explicit signals plus a capped "bridge" to taste.
- First real-data run: Lolita Lempicka recommended to an all-masculine shelf; "adds amber" for a scent 89% like Sauvage; ratings shown as 4.343 → explicit "marketed for" preference, accord novelty in Gap mode, rounding, two-per-brand cap.
- Fixture bug: all fixtures shared one brand, so the brand cap silently trimmed results → distinct fixture brands.

## 4. App
- Bug: advisor panel crashed on open: a `useEffect` arrow returned a value → block body.
- Duplicated page titles ("Sign in · Sillage · Sillage") → title template only.
- Sign-up always said "check your email", even when a session was returned → straight to onboarding.

## 5. Evals (v1 → v2)
- v1: offers 83.3% precision (3 flankers matched as exact), personas 27/30.
- v2: allowlist matcher, flanker detection, family novelty, mode-specific gap weights → offers 100% precision / 100% recall, personas 28/30. The 2 remaining failures are an open product question (Q-01), not tuned away.
- A unit test then caught Gap mode recommending a 97%-identical scent → Gap mode excludes ≥ 85% overlap.
- A data query found 2 pool fragrances with no notes, which a "never oud" preference can't be checked against → excluded when any note is avoided.

## 6. Quality
- pgTAP: 38/38 on first run.
- E2E first run: 8/12. Fixes: two locator bugs in tests; one test assumed a $10 budget empties results (by design, unknown-price items stay, flagged), replaced with a component test; **two real WCAG contrast failures**: the primary button's hover state faded to 3.7:1 → darken instead of fade.
- Final: 52 unit, 38 database, 11 E2E (desktop + mobile, WCAG 2.2 AA scan on 13 screens/states, keyboard-only flow), production build, SEC-03 bundle check.

## 7. Collection Intelligence (PRD 08) and redesign, 22 Oct 2026
- M0 audit first ([plan](../INTELLIGENCE-PLAN.md)): no wear history, no occasion data, no weather source → DEC-34, DEC-38, DEC-39.
- CS-03 failed on first run: with season and occasion unavailable, overall confidence was still "high" → any unavailable dimension now means low confidence.
- Ties produced "strongest in fall; thinnest in fall" → tie wording ("Every season has a well-suited bottle.").
- Scent Lab saturated: Sauvage + Tobacco Vanille scored 100 → complementarity recalibrated (DEC-41); real pairs now spread 44–98.
- DS-02 test was over-specific (a casual daytime pick in cold weather legitimately isn't the amber) → the test now checks that context changes the pick, not which bottle wins.
- E2E: three contrast failures on the new editorial styles (white/45, muted numerals) → raised; invalid `<dl>` children in the Lab; the shelf overflowed on a 390 px phone (bottle row 507 px) → responsive bottle sizes and `min-w-0` on the main column.
- Lint caught `setState` inside effects in the agent walkthrough → moved into timer callbacks.
- Final: 83 unit, 60 database, 14 E2E, evals v4 (Collection Intelligence 9/9, offers 100%, personas 29/32, fabrications 0/7).

## 8. Free model option, 26 Oct 2026
- Gemini added as a second adapter behind the same loop, tools and grounding check (DEC-46); SDK pinned to `@google/genai` 2.29.1 (a release older than two weeks).
- Gemini's schema subset lacks Claude-style nullable unions → schemas converted and nulls restored before the shared validation (DEC-47). Tested: no `anyOf`/`additionalProperties` reaches Gemini, and a bare `{mode: "gaps"}` call validates.
- Found while costing it: Today's AI sentence had no rate limit and re-runs on every chip change → new `explain` bucket (migration + 2 pgTAP checks).
- Refactor caught a test-fixture bug: fixture ids are random per call, so the shared advisor context now exports its catalog.
- The live-agent eval was a placeholder → now 8 prompts with expectations written first, run against whichever model is configured.
- Final: 93 unit, 62 database, 14 E2E; evals v5 unchanged (offers 100%, personas 29/32, fabrications 0/7, Collection Intelligence 9/9). The live model run is pending the owner's key.
- First live runs on production: `gemini-3.8-flash` returned 503 (overloaded) and then hung until a 504 on every attempt, while `gemini-3.6-flash` answered correctly (grounded picks, right tools) in 2–4 rounds. Fixes: a 20 s per-call timeout, timeouts and 5xx move to the next free model, a 50 s budget per answer before the rule-based engines take over, and `gemini-3.6-flash` as the default with `gemini-2.5-flash` as fallback. Lowering thinking to "minimal" was tried and rejected by the API (400), so it stays "low".
- Today's AI sentence silently fell back to the template on production: Gemini rejects request deadlines under 10 s (400) and it used 8 s → 12 s, and the advisor ends its answer before a deadline could drop under 10 s. Found by logging the error text, which is now kept (no secrets in it).
