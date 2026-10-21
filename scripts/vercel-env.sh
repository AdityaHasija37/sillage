#!/usr/bin/env bash
# Copies the hosted Supabase settings from .env.production.local (gitignored) into the linked
# Vercel project's Production environment, without printing them. Run from the repo root after
# `npx vercel link`. Then add your own ANTHROPIC_API_KEY and SERPAPI_API_KEY (see docs/DEPLOY.md).
set -euo pipefail
[ -f .env.production.local ] || { echo "Missing .env.production.local"; exit 1; }
set -a; . ./.env.production.local; set +a
# Public values (the anon key is meant to be public; RLS protects the data) need --type config.
for name in NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY; do
  npx vercel env add "$name" --environment production --type config --value "${!name}" --yes --force >/dev/null
  echo "set $name"
done
for name in SUPABASE_SERVICE_ROLE_KEY RATE_SALT; do
  printf '%s' "${!name}" | npx vercel env add "$name" --environment production --force >/dev/null
  echo "set $name"
done
echo "Done. Now add: npx vercel env add ANTHROPIC_API_KEY production   and   npx vercel env add SERPAPI_API_KEY production"
