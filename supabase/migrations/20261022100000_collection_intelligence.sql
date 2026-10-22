-- 0005 Collection Intelligence (PRD 08 §9): wear logs, daily-pick sessions and feedback, layering
-- experiments and feedback, and an allowlisted product-event log. Every row is owned by a user and
-- locked to them by RLS; demo sandboxes are ordinary isolated users, so the same rules apply.

create table public.wear_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  fragrance_id uuid not null references public.fragrances (id) on delete cascade,
  worn_at timestamptz not null default now(),
  source text not null default 'daily_pick' check (source in ('daily_pick', 'manual', 'scent_lab')),
  -- Repeated "Wore this" taps in one selector session must not create duplicates (PRD §6.3).
  idempotency_key text check (char_length(idempotency_key) <= 120),
  unique (user_id, idempotency_key)
);
create index wear_logs_user_idx on public.wear_logs (user_id, worn_at desc);

create table public.daily_pick_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  context_json jsonb not null default '{}',
  recommendation_json jsonb not null default '[]',
  algorithm_version text not null,
  created_at timestamptz not null default now()
);
create index daily_pick_sessions_user_idx on public.daily_pick_sessions (user_id, created_at desc);

create table public.daily_pick_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  session_id uuid not null references public.daily_pick_sessions (id) on delete cascade,
  fragrance_id uuid not null references public.fragrances (id) on delete cascade,
  action text not null check (action in ('wore', 'not_for_me')),
  reason text check (reason in ('too_strong', 'too_weak', 'poor_context', 'dislike_scent', 'other')),
  created_at timestamptz not null default now(),
  unique (session_id, fragrance_id, action)
);
create index daily_pick_feedback_user_idx on public.daily_pick_feedback (user_id, created_at desc);

create table public.layering_experiments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  pair_key text not null check (char_length(pair_key) = 73),
  fragrance_a_id uuid not null references public.fragrances (id) on delete cascade,
  fragrance_b_id uuid not null references public.fragrances (id) on delete cascade,
  application_order text not null default 'a_first' check (application_order in ('a_first', 'b_first', 'together')),
  -- The prediction as it was when saved; later feedback never overwrites it (SL-05).
  prediction_json jsonb not null,
  algorithm_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (fragrance_a_id <> fragrance_b_id)
);
create index layering_experiments_user_idx on public.layering_experiments (user_id, created_at desc);
create index layering_experiments_pair_idx on public.layering_experiments (user_id, pair_key);

create table public.layering_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  experiment_id uuid not null references public.layering_experiments (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  perceived_intensity text check (perceived_intensity in ('soft', 'moderate', 'strong')),
  notes text check (char_length(notes) <= 500),
  would_repeat boolean,
  worn_at timestamptz not null default now()
);
create index layering_feedback_experiment_idx on public.layering_feedback (experiment_id, worn_at desc);

-- PRD §11: product events with fixed names and safe properties only (no notes, no location).
create table public.product_events (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (name in ('collection_score_viewed', 'score_preview_completed', 'daily_selector_run', 'daily_pick_feedback_submitted', 'layering_prediction_created', 'layering_experiment_saved', 'layering_feedback_submitted')),
  properties jsonb not null default '{}' check (jsonb_typeof(properties) = 'object' and octet_length(properties::text) <= 1000),
  created_at timestamptz not null default now()
);
create index product_events_name_idx on public.product_events (name, created_at desc);

-- Ownership helpers for child rows (feedback must point at the caller's own parent).
create or replace function public.owns_daily_session(p uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.daily_pick_sessions where id = p and user_id = auth.uid());
$$;
create or replace function public.owns_experiment(p uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.layering_experiments where id = p and user_id = auth.uid());
$$;
-- Layering is only for bottles the caller owns (SL-01), enforced in the database too.
create or replace function public.owns_fragrance(p uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.collection_items where fragrance_id = p and user_id = auth.uid());
$$;
revoke execute on function public.owns_daily_session(uuid), public.owns_experiment(uuid), public.owns_fragrance(uuid) from public, anon;
grant execute on function public.owns_daily_session(uuid), public.owns_experiment(uuid), public.owns_fragrance(uuid) to authenticated;

alter table public.wear_logs enable row level security;
alter table public.daily_pick_sessions enable row level security;
alter table public.daily_pick_feedback enable row level security;
alter table public.layering_experiments enable row level security;
alter table public.layering_feedback enable row level security;
alter table public.product_events enable row level security;
revoke all on public.wear_logs, public.daily_pick_sessions, public.daily_pick_feedback, public.layering_experiments, public.layering_feedback, public.product_events from anon;

create policy wear_logs_own on public.wear_logs for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()) and public.owns_fragrance(fragrance_id));
create policy daily_sessions_own on public.daily_pick_sessions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy daily_feedback_own on public.daily_pick_feedback for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()) and public.owns_daily_session(session_id) and public.owns_fragrance(fragrance_id));
create policy experiments_own on public.layering_experiments for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.owns_fragrance(fragrance_a_id) and public.owns_fragrance(fragrance_b_id));
create policy layering_feedback_own on public.layering_feedback for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()) and public.owns_experiment(experiment_id));
-- Events are write-only for users: they can add their own, nobody reads them through the API.
create policy events_insert_own on public.product_events for insert to authenticated with check (user_id = (select auth.uid()));
revoke select, update, delete on public.product_events from authenticated;
