-- 0002 Indexed community signals for candidate retrieval (recommendation pool, advisor search).
alter table public.fragrances
  add column community_votes int generated always as (coalesce((community ->> 'votes')::int, 0)) stored,
  add column community_rating numeric generated always as ((community ->> 'rating')::numeric) stored;

create index fragrances_votes_idx on public.fragrances (community_votes desc);
create index fragrances_external_idx on public.fragrances (provider, external_id);
