# Deploy

Not yet deployed. Nothing is pushed or deployed without the owner's go-ahead (DEC-01).

1. **Supabase**: create a free project; `npx supabase link --project-ref <ref>`; `npx supabase db push`.
2. **Catalog**: `npm run catalog:build && node scripts/load-catalog.mjs --env .env.production.local` (service-role key for the hosted project, kept local).
3. **Auth**: set Site URL and redirect URLs to the production domain; decide on email confirmation (Q-02); paste `supabase/templates/*.html` into the email templates.
4. **Vercel**: import the GitHub repo; set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RATE_SALT`; optionally `ANTHROPIC_API_KEY`, `ADVISOR_MODEL`, `SERPAPI_API_KEY`, `NEXT_PUBLIC_CONTACT_EMAIL`. Never set `DEMO_HOURLY_LIMIT` in production.
5. **Verify**: `/api/health` shows `database: true` and which integrations are live; run the demo end to end on a phone.
