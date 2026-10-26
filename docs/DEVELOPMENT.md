# Development

Requires Node 22 and Docker.

```bash
npm install
npx supabase start                 # local Postgres/Auth on ports 553xx
cp .env.example .env.local         # fill from `npx supabase status`
npm run catalog:build              # downloads the open dataset, writes .data/catalog.jsonl (~2 s)
npm run catalog:load               # upserts ~38k fragrances (~10 s)
npm run dev -- --port 3100
```

| Command | What it runs |
|---|---|
| `npm run check` | typecheck, lint, unit tests, production build |
| `npm test` | Vitest unit tests |
| `npm run test:db` | pgTAP row-level-security tests |
| `npm run test:e2e` | Playwright (desktop + mobile, includes the axe WCAG scan). Set `DEMO_HOURLY_LIMIT=1000` in `.env.local` |
| `npm run evals` | Eval suite → `docs/evals/latest.json`, `REPORT.md`, `history/`. Use `EVAL_LABEL=...` |
| `node scripts/check-bundle.mjs` | SEC-03: no server secrets in the client bundle (after build) |
| `node scripts/capture-screenshots.mjs` | Regenerates README screenshots from a running server |

Optional keys (`.env.local`): `GEMINI_API_KEY` (free live advisor) and/or `ANTHROPIC_API_KEY` (without either, the advisor runs in offline mode), `GEMINI_MODEL`, `ADVISOR_MODEL`, `ADVISOR_PROVIDER`, `SERPAPI_API_KEY` (live prices; without it, labelled sample offers).

Regenerate DB types after a migration: `npm run db:types`.
