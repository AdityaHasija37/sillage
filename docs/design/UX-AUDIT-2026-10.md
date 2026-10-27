# UX audit, October 2026

A heuristic review of every screen on desktop (1280 px) and phone (390 px), done as a first-time user on the sample shelf. Findings are ranked by impact on the two things the product sells: **trust** and **time to an answer**. Every P0–P2 item below was built and shipped.

| # | Severity | Screen | Finding | Change |
|---|---|---|---|---|
| 1 | P0 · accuracy | Price check (sample) | A deliberately wrong EDT listing showed as an **exact match**: sample titles repeated the concentration ("…Eau de Parfum Eau de Toilette…") | Sample titles use the core name; the matcher treats two named concentrations as a contradiction, never a match |
| 2 | P0 · trust | Advisor | Answers printed raw markdown (`**bold**`) as one wall of text | A small, safe formatter: paragraphs, bullet and numbered lists, bold, citation chips. No model HTML reaches the page |
| 3 | P0 · feedback | Advisor | A 6–25 s wait showed one static line | Staged progress (shelf → engine → checks → writing) with elapsed time and an honest expectation |
| 4 | P1 · time to answer | Today (phone) | The pick sat ~900 px below a long form | Answer first on phones with a one-line context summary and an "Adjust" link; strength, mood and "Not today" moved under **More options** (with a count) on every size |
| 5 | P1 · legibility | Shelf | Truncated names ("BLEU DE CHA…") and unexplained ♥ / + / · marks | Two-line labels without the concentration, a legend, and the rating in each bottle's accessible name |
| 6 | P1 · empty state | Scent Lab | The bench opened empty with two dropdowns | "Best-predicted pairs on your shelf" (top three untried, no bottle used more than twice) and **Open on bench** for saved experiments |
| 7 | P1 · layout | Advisor (phone) | The conversation scrolled inside a small box above a long tools panel | Taller conversation on phones; the tools reference collapses behind "How it works" |
| 8 | P2 · scannability | Discover | Up to seven reasons per pick | Top three reasons, "+ N more" on demand; caveats always visible |

## Principles applied

- **Answer first, controls second.** Each screen should show its result before asking for more input (Today, Lab).
- **Progressive disclosure, not removal.** Rare options are one tap away, and the tap shows what's set.
- **Never hide what keeps the product honest.** Caveats, price warnings and the hidden-listing list stay visible or one tap away.
- **Every change is tested.** New unit tests cover the formatter, contradictory titles, sample offers and pair suggestions; the end-to-end suite (with the WCAG 2.2 AA scan and the no-horizontal-scroll phone check) passes.

## Not changed, on purpose

- **The editorial visual language.** Serif display type, paper and ink, and the drawn bottles tested well against the "looks AI-generated" feedback; this audit was about flow, not style.
- **Fake streaming.** The advisor's progress stages describe what an answer goes through; real token streaming would need a streaming API route and is noted as a follow-up.
