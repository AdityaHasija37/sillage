# 06 · Portfolio Case Study & Evidence Plan

*Story framework that makes the project easy to evaluate by recruiters*

Version 1.0 • 20 October 2026 • Status: build specification • Owner: independent portfolio project

Source of truth: this pack; if instructions conflict, record the decision in the Decision Register and update impacted documents. Assumptions are not verified production integrations.

## Portfolio objective

A recruiter who lands on the portfolio project card should understand the user problem, the role you played, the full product scope, and the demo’s best interaction in two minutes. Public URL, GitHub repository, product case study and documentation must be easy to find. Do not require a login to evaluate the experience.

## Case study structure

- Hero: Sillage, one-sentence thesis, Live Demo + GitHub. 2. User problem and evidence status (hypothesis vs actual interviews). 3. Target user and three core jobs. 4. Why collection context changes recommendation relevance. 5. Before/after user flow. 6. Scope decisions and explicit non-goals. 7. AI architecture and tool boundaries. 8. Catalog and shopping integration constraints. 9. Screenshots, demo clip and prototype. 10. QA, accessibility, security and evaluated metrics. 11. Lessons, trade-offs and what comes next.

## Three decisions worth featuring

Decision A: broad searchable catalog via replaceable adapter rather than manually owning entire database; trade-off: coverage vs vendor dependence. Decision B: deterministic ranking + AI explanation rather than free-form generated product recommendations; trade-off: control/reliability vs flexibility. Decision C: optional chat plus dashboard-first information architecture; trade-off: ease of discovery vs conversational expressiveness. Decision D: exact variant-aware price matching rather than naive lowest price; trade-off: fewer results vs accuracy.

## Recruiter-facing demo script

0:00–0:15 explain current collection and goal; 0:15–0:35 inspect owned collection and scent coverage; 0:35–1:00 choose Fill a Gap and show rank/overlap logic; 1:00–1:20 ask contextual question; 1:20–1:45 select size/concentration and compare offers with source caveat; 1:45–2:00 open GitHub case study. Use prerecorded mock offers only if explicitly labeled, never present them as live retailer prices.

## README outline

What it does; why it exists; watch demo; live demo URL; screenshots; features; system diagram; technical choices; local quick-start; environment variables (names only); providers and their limitations; tests and verified counts; security notes; known limitations; roadmap; links to PRD, architecture, QA and case study. Ensure actual GitHub links only once repo exists.

## Evidence and honest metrics

Track instrumented time-to-first-collection, demo flow completion, search latency, recommendation relevance evaluation, offer matching precision, catalog coverage sampling and AI inference cost. Distinguish targets from measured outcomes. Once built, replace placeholders with verified numbers and dated test evidence.

## Portfolio integration checklist

Link Sillage from https://adityahasija.vercel.app/ when live; show visually compelling project card, public demo, GitHub, case study and a short walkthrough. Public deployments must not expose auth keys or private records. Avoid fake testimonials, fabricated usage metrics or invented retailer discounts.
