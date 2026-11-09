-- Keeping the catalog current (DEC-56 to DEC-59): a log of catalog refreshes, user requests for
-- fragrances the catalog doesn't have, and a merge that moves everything pointing at an unverified
-- Open Beauty Facts entry onto the full catalog entry once a refresh brings it in.

-- ── Refresh log ─────────────────────────────────────────────────────────────
-- Written only by the refresh job (service role). The newest row says which dataset version is
-- loaded, so an unchanged dataset isn't reloaded; the health check reports when it last ran.
create table public.catalog_refreshes (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('fragrantica_decant')),
  source_version text check (char_length(source_version) <= 200),
  source_published_at timestamptz,
  loaded int not null default 0 check (loaded >= 0),
  new_releases int not null default 0 check (new_releases >= 0),
  merged int not null default 0 check (merged >= 0),
  skipped_unchanged boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.catalog_refreshes enable row level security;
revoke all on public.catalog_refreshes from anon, authenticated;

-- ── Missing-fragrance requests ──────────────────────────────────────────────
-- What people searched for and couldn't find. Owner-only rows; the aggregate below is readable only
-- by the service role, so typed text is never shown to other users. Demo sandboxes are deleted after
-- a day, but their requests stay (user set to null) because they are still demand signal.
create table public.fragrance_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid() references auth.users (id) on delete set null,
  query text not null check (char_length(query) between 2 and 120),
  normalized text not null check (char_length(normalized) between 2 and 120),
  created_at timestamptz not null default now(),
  unique (user_id, normalized)
);
create index fragrance_requests_normalized_idx on public.fragrance_requests (normalized);
alter table public.fragrance_requests enable row level security;
revoke all on public.fragrance_requests from anon;
grant select, insert on public.fragrance_requests to authenticated;
create policy fragrance_requests_own_select on public.fragrance_requests for select to authenticated using (user_id = (select auth.uid()));
create policy fragrance_requests_own_insert on public.fragrance_requests for insert to authenticated with check (user_id = (select auth.uid()));

/** Most-requested missing fragrances, and whether the catalog now has a name containing the request. */
create or replace function public.top_fragrance_requests(p_limit int default 25)
returns table (normalized text, example text, requests bigint, last_requested timestamptz, now_in_catalog boolean)
language sql stable security definer set search_path = '' as $$
  select r.normalized,
         (array_agg(r.query order by r.created_at desc))[1],
         count(*),
         max(r.created_at),
         exists (select 1 from public.fragrances f where f.metadata_quality <> 'unverified' and f.search_text like '%' || r.normalized || '%')
  from public.fragrance_requests r
  group by r.normalized
  order by count(*) desc, max(r.created_at) desc
  limit least(greatest(p_limit, 1), 200);
$$;
revoke all on function public.top_fragrance_requests(int) from public, anon, authenticated;
grant execute on function public.top_fragrance_requests(int) to service_role;

-- ── Merge an unverified entry into its full catalog entry ───────────────────
-- Moves every user row from p_from to p_to, dropping a moved row only where the user already has the
-- same row on p_to, then deletes p_from. Variants belong to a fragrance, so a moved bottle keeps no
-- variant. Historical JSON snapshots (recommendation runs, daily picks) keep their old ids.
create or replace function public.merge_fragrance(p_from uuid, p_to uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_from = p_to then raise exception 'cannot merge a fragrance into itself'; end if;
  if not exists (select 1 from public.fragrances where id = p_from and metadata_quality = 'unverified') then
    raise exception 'only unverified entries are merged';
  end if;
  if not exists (select 1 from public.fragrances where id = p_to and metadata_quality <> 'unverified') then
    raise exception 'the target must be a full catalog entry';
  end if;

  delete from public.collection_items c where c.fragrance_id = p_from
    and exists (select 1 from public.collection_items t where t.user_id = c.user_id and t.fragrance_id = p_to);
  update public.collection_items set fragrance_id = p_to, variant_id = null where fragrance_id = p_from;

  delete from public.wishlist_items w where w.fragrance_id = p_from
    and exists (select 1 from public.wishlist_items t where t.user_id = w.user_id and t.fragrance_id = p_to);
  update public.wishlist_items set fragrance_id = p_to, variant_id = null where fragrance_id = p_from;

  delete from public.recommendation_feedback f where f.fragrance_id = p_from
    and exists (select 1 from public.recommendation_feedback t where t.run_id = f.run_id and t.fragrance_id = p_to);
  update public.recommendation_feedback set fragrance_id = p_to where fragrance_id = p_from;

  update public.wear_logs set fragrance_id = p_to where fragrance_id = p_from;

  delete from public.daily_pick_feedback f where f.fragrance_id = p_from
    and exists (select 1 from public.daily_pick_feedback t where t.session_id = f.session_id and t.action = f.action and t.fragrance_id = p_to);
  update public.daily_pick_feedback set fragrance_id = p_to where fragrance_id = p_from;

  -- A pairing of the two entries with each other would become a bottle layered with itself.
  delete from public.layering_experiments where (fragrance_a_id = p_from and fragrance_b_id = p_to) or (fragrance_a_id = p_to and fragrance_b_id = p_from);
  update public.layering_experiments
     set fragrance_a_id = case when fragrance_a_id = p_from then p_to else fragrance_a_id end,
         fragrance_b_id = case when fragrance_b_id = p_from then p_to else fragrance_b_id end,
         pair_key = case when (case when fragrance_a_id = p_from then p_to else fragrance_a_id end)::text < (case when fragrance_b_id = p_from then p_to else fragrance_b_id end)::text
                         then (case when fragrance_a_id = p_from then p_to else fragrance_a_id end)::text || ':' || (case when fragrance_b_id = p_from then p_to else fragrance_b_id end)::text
                         else (case when fragrance_b_id = p_from then p_to else fragrance_b_id end)::text || ':' || (case when fragrance_a_id = p_from then p_to else fragrance_a_id end)::text end,
         updated_at = now()
   where fragrance_a_id = p_from or fragrance_b_id = p_from;

  delete from public.fragrances where id = p_from;
end;
$$;
revoke all on function public.merge_fragrance(uuid, uuid) from public, anon, authenticated;
grant execute on function public.merge_fragrance(uuid, uuid) to service_role;

-- Missing-fragrance requests get their own small bucket.
alter table public.rate_counters drop constraint if exists rate_counters_bucket_check;
alter table public.rate_counters add constraint rate_counters_bucket_check
  check (bucket in ('chat', 'offers', 'catalog_live', 'demo', 'explain', 'request'));
