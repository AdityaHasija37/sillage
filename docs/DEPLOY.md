# Deploy

Live at https://sillage-rosy.vercel.app (Vercel project `sillage`, Supabase project `sillage`, us-east-2). Deployed 21 Oct 2026 with the owner's go-ahead.

Redeploy: `npx vercel deploy --prod`. Hosted Supabase settings are copied into Vercel with `./scripts/vercel-env.sh` (reads the gitignored `.env.production.local`). To auto-deploy on push, grant Vercel's GitHub app access to the repo in Vercel → Settings → Git.

1. **Supabase**: create a free project; `npx supabase link --project-ref <ref>`; `npx supabase db push`.
2. **Catalog**: `npm run catalog:build && node scripts/load-catalog.mjs --env .env.production.local` (service-role key for the hosted project, kept local).
3. **Auth**: set Site URL and redirect URLs to the production domain; decide on email confirmation (Q-02); paste `supabase/templates/*.html` into the email templates.
4. **Vercel**: import the GitHub repo; set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RATE_SALT`; optionally `ANTHROPIC_API_KEY`, `ADVISOR_MODEL`, `SERPAPI_API_KEY`, `NEXT_PUBLIC_CONTACT_EMAIL`. Never set `DEMO_HOURLY_LIMIT` in production.
5. **Verify**: `/api/health` shows `database: true` and which integrations are live; run the demo end to end on a phone.

Smoke-test a deployment: `BASE_URL=https://sillage-rosy.vercel.app npx playwright test tests/e2e/demo.spec.ts -g "E2E-01|FR-07"` (2 demo sandboxes; the live demo allows 5 per visitor per hour). Passed on 21 Oct 2026.

Collection Intelligence (22 Oct 2026) adds migration `20261022100000_collection_intelligence.sql`: run `npx supabase db push` before deploying the app. No new environment variables (Open-Meteo needs no key).
