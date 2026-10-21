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
