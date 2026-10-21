-- 0001 Foundation: shared catalog, per-user collection data, recommendations, offers, chat.
-- Catalog and offer tables are public-read and written only by the app server (service_role).
-- Everything a user owns is locked to that user by RLS (SEC-01).

create extension if not exists pg_trgm with schema extensions;

-- ── Catalog ────────────────────────────────────────────────────────────────

create table public.fragrances (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('fragrantica_decant', 'openbeautyfacts', 'fragella', 'fixture')),
  external_id text not null,
  brand text not null check (char_length(brand) between 1 and 120),
  name text not null check (char_length(name) between 1 and 200),
  canonical_key text not null,
  year int check (year between 1700 and 2100),
  gender text check (gender in ('male', 'female', 'unisex')),
  family text check (family in ('citrus', 'aromatic', 'aquatic', 'green', 'floral', 'woody', 'amber', 'gourmand', 'leather', 'chypre')),
  family_label text,
  concentration text check (concentration in ('EDC', 'EDT', 'EDP', 'Parfum', 'Extrait', 'Elixir', 'Cologne')),
  concentration_basis text check (concentration_basis in ('name', 'description', 'provider')),
  sizes_ml numeric[] not null default '{}',
  perfumers text[] not null default '{}',
  accords jsonb not null default '[]',
  notes jsonb not null default '{"top":[],"middle":[],"base":[],"flat":[]}',
  community jsonb,
  themes jsonb not null default '{"pros":[],"cons":[]}',
  similar_to jsonb not null default '[]',
  popularity bigint not null default 0,
  price_band text check (price_band in ('under_50', '50_100', '100_200', '200_plus')),
  price_basis text,
  brand_tier text check (brand_tier in ('mass', 'affordable', 'designer', 'niche', 'luxury')),
  image_url text check (image_url is null or image_url ~ '^https://'),
  source_url text check (source_url is null or source_url ~ '^https://'),
  metadata_quality text not null default 'partial' check (metadata_quality in ('verified', 'partial', 'unverified')),
  search_text text generated always as (lower(brand || ' ' || name)) stored,
  fetched_at timestamptz not null default now(),
  unique (provider, external_id)
);
create index fragrances_search_trgm_idx on public.fragrances using gin (search_text extensions.gin_trgm_ops);
create index fragrances_popularity_idx on public.fragrances (popularity desc);
create index fragrances_canonical_idx on public.fragrances (canonical_key);
create index fragrances_family_idx on public.fragrances (family);

create table public.variants (
  id uuid primary key default gen_random_uuid(),
  fragrance_id uuid not null references public.fragrances (id) on delete cascade,
  concentration text not null check (concentration in ('EDC', 'EDT', 'EDP', 'Parfum', 'Extrait', 'Elixir', 'Cologne')),
  size_ml numeric not null check (size_ml between 1 and 1000),
  edition text check (char_length(edition) <= 80),
  variant_key text generated always as (concentration || ':' || size_ml::text || ':' || coalesce(lower(edition), '')) stored,
  created_at timestamptz not null default now(),
  unique (fragrance_id, variant_key)
);

alter table public.fragrances enable row level security;
alter table public.variants enable row level security;
create policy fragrances_public_read on public.fragrances for select to anon, authenticated using (true);
create policy variants_public_read on public.variants for select to anon, authenticated using (true);
revoke insert, update, delete on public.fragrances, public.variants from anon, authenticated;

-- A signed-in user picks concentration + size; the variant row is shared, so it's created by a
-- definer function with fixed validation instead of an insert grant.
create or replace function public.ensure_variant(p_fragrance_id uuid, p_concentration text, p_size_ml numeric)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_concentration not in ('EDC', 'EDT', 'EDP', 'Parfum', 'Extrait', 'Elixir', 'Cologne') or p_size_ml is null or p_size_ml < 1 or p_size_ml > 1000 then
    raise exception 'invalid variant' using errcode = '22023';
  end if;
  insert into public.variants (fragrance_id, concentration, size_ml)
  values (p_fragrance_id, p_concentration, p_size_ml)
  on conflict (fragrance_id, variant_key) do nothing;
  select id into v from public.variants
  where fragrance_id = p_fragrance_id and concentration = p_concentration and size_ml = p_size_ml and edition is null;
  return v;
end;
$$;
revoke execute on function public.ensure_variant(uuid, text, numeric) from public, anon;
grant execute on function public.ensure_variant(uuid, text, numeric) to authenticated;

-- Fuzzy catalog search ranked by similarity, then popularity.
create or replace function public.search_fragrances(p_query text, p_limit int default 20, p_offset int default 0)
returns setof public.fragrances
language sql
stable
set search_path = ''
as $$
  select f.* from public.fragrances f
  where char_length(trim(p_query)) >= 2
    and (f.search_text operator(extensions.%) lower(trim(p_query)) or f.search_text like '%' || lower(trim(p_query)) || '%')
  order by (f.search_text like lower(trim(p_query)) || '%') desc,
           (f.search_text like '%' || lower(trim(p_query)) || '%') desc,
           extensions.similarity(f.search_text, lower(trim(p_query))) desc,
           f.popularity desc
  limit least(greatest(p_limit, 1), 50) offset greatest(p_offset, 0);
$$;
grant execute on function public.search_fragrances(text, int, int) to anon, authenticated;

-- ── Per-user data ──────────────────────────────────────────────────────────

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 80),
  region text not null default 'US' check (region in ('US')),
  budget_min int check (budget_min between 0 and 5000),
  budget_max int check (budget_max between 0 and 5000),
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  check (budget_min is null or budget_max is null or budget_min <= budget_max)
);

create table public.preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  liked_notes jsonb not null default '[]' check (jsonb_typeof(liked_notes) = 'array' and jsonb_array_length(liked_notes) <= 40),
  disliked_notes jsonb not null default '[]' check (jsonb_typeof(disliked_notes) = 'array' and jsonb_array_length(disliked_notes) <= 40),
  liked_families jsonb not null default '[]' check (jsonb_typeof(liked_families) = 'array' and jsonb_array_length(liked_families) <= 10),
  seasons jsonb not null default '[]' check (jsonb_typeof(seasons) = 'array' and jsonb_array_length(seasons) <= 4),
  occasions jsonb not null default '[]' check (jsonb_typeof(occasions) = 'array' and jsonb_array_length(occasions) <= 8),
  performance jsonb not null default '{}' check (jsonb_typeof(performance) = 'object'),
  updated_at timestamptz not null default now()
);

create table public.collection_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  fragrance_id uuid not null references public.fragrances (id) on delete restrict,
  variant_id uuid references public.variants (id) on delete set null,
  -- Ownership never implies liking: sentiment stays null until the user says so (PRD).
  sentiment text check (sentiment in ('love', 'like', 'neutral', 'dislike')),
  rating smallint check (rating between 1 and 10),
  owned_since date,
  notes text check (char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  unique nulls not distinct (user_id, fragrance_id, variant_id)
);
create index collection_items_user_idx on public.collection_items (user_id, created_at desc);

create table public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  fragrance_id uuid not null references public.fragrances (id) on delete restrict,
  variant_id uuid references public.variants (id) on delete set null,
  created_at timestamptz not null default now(),
  unique nulls not distinct (user_id, fragrance_id, variant_id)
);
create index wishlist_items_user_idx on public.wishlist_items (user_id, created_at desc);

create table public.recommendation_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  mode text not null check (mode in ('similar', 'different', 'gaps')),
  source text not null default 'discover' check (source in ('discover', 'advisor')),
  criteria_json jsonb not null default '{}',
  results_json jsonb not null default '[]',
  engine_version text not null,
  created_at timestamptz not null default now()
);
create index recommendation_runs_user_idx on public.recommendation_runs (user_id, created_at desc);

create table public.recommendation_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  run_id uuid not null references public.recommendation_runs (id) on delete cascade,
  fragrance_id uuid not null references public.fragrances (id) on delete cascade,
  reaction text not null check (reaction in ('relevant', 'not_relevant')),
  created_at timestamptz not null default now(),
  unique (run_id, fragrance_id)
);

create table public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) <= 8000),
  tool_summary_json jsonb not null default '[]',
  created_at timestamptz not null default now()
);
create index chat_messages_session_idx on public.chat_messages (session_id, created_at);

-- Feedback must point at the caller's own run; chat messages at the caller's own session.
create or replace function public.owns_run(p_run uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.recommendation_runs where id = p_run and user_id = auth.uid());
$$;
create or replace function public.owns_chat(p_session uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.chat_sessions where id = p_session and user_id = auth.uid());
$$;
revoke execute on function public.owns_run(uuid), public.owns_chat(uuid) from public, anon;
grant execute on function public.owns_run(uuid), public.owns_chat(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.preferences enable row level security;
alter table public.collection_items enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.recommendation_runs enable row level security;
alter table public.recommendation_feedback enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;

revoke all on public.profiles, public.preferences, public.collection_items, public.wishlist_items,
  public.recommendation_runs, public.recommendation_feedback, public.chat_sessions, public.chat_messages from anon;

create policy profiles_own on public.profiles for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy preferences_own on public.preferences for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy collection_own on public.collection_items for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy wishlist_own on public.wishlist_items for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy runs_own_select on public.recommendation_runs for select to authenticated using (user_id = (select auth.uid()));
create policy runs_own_insert on public.recommendation_runs for insert to authenticated with check (user_id = (select auth.uid()));
create policy feedback_own on public.recommendation_feedback for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()) and public.owns_run(run_id));
create policy chat_sessions_own on public.chat_sessions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy chat_messages_own_select on public.chat_messages for select to authenticated using (user_id = (select auth.uid()));
create policy chat_messages_own_insert on public.chat_messages for insert to authenticated
  with check (user_id = (select auth.uid()) and public.owns_chat(session_id));

-- New users get a profile and preferences row.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 80));
  insert into public.preferences (user_id) values (new.id);
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ── Offers (shared, short-lived cache) ─────────────────────────────────────

create table public.offer_snapshots (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.variants (id) on delete cascade,
  provider text not null check (provider in ('serpapi_google_shopping', 'sample')),
  merchant text not null check (char_length(merchant) <= 120),
  title text not null check (char_length(title) <= 300),
  item_url text not null check (item_url ~ '^https://'),
  size_ml numeric,
  concentration text,
  condition text,
  currency text not null default 'USD' check (currency = 'USD'),
  list_price numeric(10, 2) not null check (list_price > 0),
  shipping_price numeric(10, 2) check (shipping_price >= 0),
  tax_price numeric(10, 2) check (tax_price >= 0),
  availability text,
  match_status text not null check (match_status in ('exact', 'probable', 'rejected')),
  match_reasons jsonb not null default '[]',
  checked_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index offer_snapshots_variant_idx on public.offer_snapshots (variant_id, provider, expires_at desc);
alter table public.offer_snapshots enable row level security;
create policy offers_signed_in_read on public.offer_snapshots for select to authenticated using (true);
revoke insert, update, delete on public.offer_snapshots from anon, authenticated;

-- ── Rate limits (server-only) ──────────────────────────────────────────────

create table public.rate_counters (
  bucket text not null check (bucket in ('chat', 'offers', 'catalog_live', 'demo')),
  subject text not null check (subject ~ '^[0-9a-f-]{36}$|^[0-9a-f]{64}$'),
  window_start timestamptz not null,
  hits int not null default 0,
  primary key (bucket, subject, window_start)
);
alter table public.rate_counters enable row level security;
revoke all on public.rate_counters from anon, authenticated;

-- Fixed-window counter; returns true while the caller is within p_limit hits per p_window_seconds.
create or replace function public.claim_rate(p_bucket text, p_subject text, p_limit int, p_window_seconds int)
returns boolean
language plpgsql volatile security definer set search_path = '' as $$
declare
  win timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  n int;
begin
  insert into public.rate_counters as r (bucket, subject, window_start, hits) values (p_bucket, p_subject, win, 1)
  on conflict (bucket, subject, window_start) do update set hits = r.hits + 1
  returning hits into n;
  delete from public.rate_counters where window_start < now() - interval '2 days';
  return n <= p_limit;
end;
$$;
revoke execute on function public.claim_rate(text, text, int, int) from public, anon, authenticated;
grant execute on function public.claim_rate(text, text, int, int) to service_role;

-- ── Demo sandboxes (server-only, same model as Touchline DEC-48) ───────────

create table public.demo_accounts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index demo_accounts_created_at_idx on public.demo_accounts (created_at);
alter table public.demo_accounts enable row level security;
revoke all on public.demo_accounts from anon, authenticated;
grant select, insert on public.demo_accounts to service_role;

create or replace function public.demo_capacity_ok() returns boolean
language sql stable security definer set search_path = '' as $$
  select (select count(*) from public.demo_accounts) < 300;
$$;
create or replace function public.expired_demo_accounts(p_limit int default 50) returns setof uuid
language sql stable security definer set search_path = '' as $$
  select user_id from public.demo_accounts
  where created_at < now() - interval '24 hours'
  order by created_at limit greatest(1, least(p_limit, 200));
$$;
revoke execute on function public.demo_capacity_ok(), public.expired_demo_accounts(int) from public, anon, authenticated;
grant execute on function public.demo_capacity_ok(), public.expired_demo_accounts(int) to service_role;
