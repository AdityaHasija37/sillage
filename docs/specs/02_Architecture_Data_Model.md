# 02 · Technical Architecture & Data Model

*Component contracts, storage, provider abstraction and operational safeguards*

Version 1.0 • 20 October 2026 • Status: build specification • Owner: independent portfolio project

Source of truth: this pack; if instructions conflict, record the decision in the Decision Register and update impacted documents. Assumptions are not verified production integrations.

## Architecture in one sentence

Next.js App Router + TypeScript + Tailwind/shadcn frontend and server routes, Supabase Postgres/Auth with RLS, provider adapters for fragrance catalog and product offers, and one Claude-backed tool-calling advisor. Deploy on Vercel. Keep providers mockable for automated tests and offline portfolio demonstration.

## Components and dependency boundaries

Browser → Next.js UI → authenticated server actions/API → application services (collections, catalog, recommendations, shopping, chat) → Supabase + external providers. CatalogAdapter.search(query,page), .getDetails(externalId); OfferProvider.searchOffers(fragrance,variant,region); AIAdvisor.respond(context,tools). Business logic must not depend on provider JSON shapes. Use Zod validation on all boundaries.

## Proposed database schema

| Table | Columns (minimum) | Constraint / purpose |
|---|---|---|
| profiles | user_id, display_name, region, budget_min, budget_max, created_at | user_id PK → auth.users |
| preferences | user_id, liked_notes jsonb, disliked_notes jsonb, seasons jsonb, occasions jsonb, performance jsonb | one row per user |
| fragrances | id uuid, provider, external_id, brand, name, canonical_key, image_url, description, notes_json, accords_json, metadata_quality, fetched_at | unique(provider, external_id), normalized identity |
| variants | id, fragrance_id, concentration, size_ml, edition, gender_marketing, variant_key | unique(fragrance_id,variant_key) |
| collection_items | id, user_id, fragrance_id, variant_id nullable, rating nullable, sentiment, owned_since, notes | unique(user_id,fragrance_id,variant_id) where practical |
| wishlist_items | id, user_id, fragrance_id, variant_id nullable, created_at | avoid duplicate wishlisted target |
| recommendation_runs | id, user_id nullable, mode, criteria_json, candidate_ids_json, created_at | audit/test reproducibility |
| recommendation_feedback | id, user_id, run_id, fragrance_id, reaction | one reaction per candidate |
| offer_snapshots | id, fragrance_id, variant_id, provider, merchant, item_url, size_ml, concentration, currency, list_price, shipping_price, tax_price, availability, checked_at, matching_confidence | ephemeral cache, expiry |
| chat_sessions | id, user_id, created_at | user-scoped |
| chat_messages | id, session_id, role, content, tool_summary_json, created_at | user-scoped retention rules |

## Canonical identities and variants

Use normalized brand + line/name as a broad canonical key, but never auto-merge variants purely by fuzzy string. External provider IDs persist alongside canonical records. EDT/EDP/Parfum, flanker editions and sizes are discrete variant attributes. A fragrance detail may be present before size is known; such a record is eligible for discovery but not exact-offer ranking until variant is selected.

## Example TypeScript interfaces

FragranceSummary { id: string; brand: string; name: string; imageUrl?: string; accords: string[]; source: string; dataQuality: "verified"|"partial"|"unverified" }. FragranceVariant { id: string; fragranceId: string; concentration?: string; sizeMl?: number; edition?: string }. Offer { provider: string; merchant: string; url: string; currency: "USD"; listedPrice: number; shippingPrice?: number; taxPrice?: number; matchStatus: "exact"|"probable"|"rejected"; checkedAt: string }. Recommendation { fragranceId: string; score: number; reasons: string[]; caveats: string[] }.

## Endpoint / action contracts

| Route | Input | Output |
|---|---|---|
| GET /api/catalog/search | q, page | validated summaries, hasMore, source |
| GET /api/fragrances/:id | id | details, variants, provenance |
| POST /api/collection | fragranceId, variantId?, sentiment? | owned item; authenticated |
| GET /api/dashboard | session | collection aggregates and coverage |
| POST /api/recommendations | mode, budget?, season?, context? | ranked grounded candidates |
| POST /api/chat | sessionId?, message | grounded response, citation IDs, tool status |
| POST /api/offers/search | variantId, region=US | matched offers, errors, checkedAt |
| POST /api/wishlist | fragranceId, variantId? | wishlisted item |

## Recommendation service implementation

Filter: not owned, explicit note exclusions, product eligibility, allowed budget if known. Score candidates deterministically; use mode-specific novelty overlap and available season/performance evidence. Log reason codes, input features and data gaps. AI may format explanation of top N; it cannot override factual fields or pretend unknown attributes are known. Every explanation references catalog attributes or user profile.

## Agent tools and safety

Allowed read tools: get_user_profile, get_owned_fragrances, search_catalog, get_fragrance_details, recommend_candidates, find_offers. Allowed write tools ONLY after explicit user action/confirmation: add_to_wishlist, update_preference. No purchases, emails or arbitrary web scraping. Guard against prompt injection in provider descriptions; treat returned text as data. Limit tokens, tool calls and spend per request. Never forward other users’ data.

## External provider risk and fallbacks

Catalog APIs and shopping data APIs must be independently validated for allowed usage, coverage, rate limits and production costs. Implement MockCatalogAdapter and MockOfferProvider with fixed sample records for demos/tests. Reconcile by source IDs; avoid scraped data from sites prohibiting automated use. Shop search may return partial/no offers. Cache according to vendor terms and label stale results.

## Security and deployment

RLS enforced on preferences, collections, wishlist, chat, recommendations. API authorization checks on server; URL and image allowlists where practical; environment variables scoped to server; bounded request payloads; throttling; monitoring without storing secrets or private chats in logs. Vercel previews and production; migrations + seed script; health endpoint and error reporting.

## Open technical decisions

TDR-01 choose fragrance provider after proof-of-concept; TDR-02 validate legal/technical access to shopping offers; TDR-03 decide explicit variant granularity; TDR-04 define offer freshness TTL; TDR-05 decide whether guest demo uses seeded database or deterministic local mock. None of these decisions should be represented as already validated.
