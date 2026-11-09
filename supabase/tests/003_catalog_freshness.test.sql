-- DEC-56 to DEC-59: missing-fragrance requests are owner-only and their aggregate is service-only;
-- the refresh log is service-only; merging an unverified entry moves user rows onto the full entry.
begin;
select plan(19);

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-0000000000c1', 'a3@example.test'),
  ('bbbbbbbb-0000-0000-0000-0000000000c2', 'b3@example.test');
insert into public.fragrances (id, provider, external_id, brand, name, canonical_key, metadata_quality) values
  ('ffffffff-0000-0000-0000-0000000000c1', 'openbeautyfacts', 'obf-1', 'House', 'Launch EDP 100ml', 'house::launch edp 100ml', 'unverified'),
  ('ffffffff-0000-0000-0000-0000000000c2', 'fragrantica_decant', 'dec-1', 'House', 'Launch', 'house::launch', 'partial'),
  ('ffffffff-0000-0000-0000-0000000000c3', 'fixture', 'fx-1', 'House', 'Other', 'house::other', 'partial');

create function pg_temp.as_user(uid uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;
create function pg_temp.as_anon() returns void language sql as $$
  select set_config('role', 'anon', true), set_config('request.jwt.claims', '{"role":"anon"}', true);
$$;

select ok((select bool_and(relrowsecurity) from pg_class where oid in ('public.fragrance_requests'::regclass, 'public.catalog_refreshes'::regclass)), 'RLS on requests and the refresh log');

-- Requests
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-0000000000c1');
select lives_ok($$ insert into public.fragrance_requests (query, normalized) values ('Brand New Launch', 'brand new launch') $$, 'A requests a missing fragrance');
select throws_ok($$ insert into public.fragrance_requests (query, normalized) values ('Brand New Launch!', 'brand new launch') $$, '23505', null, 'the same request twice is one request');
select throws_ok($$ insert into public.fragrance_requests (user_id, query, normalized) values ('bbbbbbbb-0000-0000-0000-0000000000c2', 'spoof', 'spoof') $$, '42501', null, 'cannot file a request as someone else');
select throws_ok($$ insert into public.fragrance_requests (query, normalized) values ('x', 'x') $$, '23514', null, 'a one-letter request is rejected');
select pg_temp.as_user('bbbbbbbb-0000-0000-0000-0000000000c2');
insert into public.fragrance_requests (query, normalized) values ('brand new launch', 'brand new launch');
select is((select count(*)::int from public.fragrance_requests), 1, 'B sees only B''s request');
select throws_ok($$ select * from public.top_fragrance_requests(10) $$, '42501', null, 'users cannot read the aggregate');
select pg_temp.as_anon();
select throws_ok($$ select * from public.fragrance_requests $$, '42501', null, 'anon cannot read requests');
select throws_ok($$ select * from public.catalog_refreshes $$, '42501', null, 'anon cannot read the refresh log');
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-0000000000c1');
select throws_ok($$ insert into public.catalog_refreshes (source) values ('fragrantica_decant') $$, '42501', null, 'users cannot write the refresh log');
select throws_ok($$ select public.merge_fragrance('ffffffff-0000-0000-0000-0000000000c1', 'ffffffff-0000-0000-0000-0000000000c2') $$, '42501', null, 'users cannot merge entries');

reset role;
select results_eq($$ select normalized, requests from public.top_fragrance_requests(10) $$, $$ values ('brand new launch'::text, 2::bigint) $$, 'the aggregate counts requests across users');

-- Merge: A owns the unverified entry, wishlisted it, wore it and layered it; B owns both entries.
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-0000000000c1');
insert into public.collection_items (fragrance_id) values ('ffffffff-0000-0000-0000-0000000000c1'), ('ffffffff-0000-0000-0000-0000000000c3');
insert into public.wear_logs (fragrance_id) values ('ffffffff-0000-0000-0000-0000000000c1');
insert into public.layering_experiments (pair_key, fragrance_a_id, fragrance_b_id, prediction_json, algorithm_version)
  values ('ffffffff-0000-0000-0000-0000000000c1:ffffffff-0000-0000-0000-0000000000c3', 'ffffffff-0000-0000-0000-0000000000c1', 'ffffffff-0000-0000-0000-0000000000c3', '{}', 'lab-1.0');
select pg_temp.as_user('bbbbbbbb-0000-0000-0000-0000000000c2');
insert into public.collection_items (fragrance_id) values ('ffffffff-0000-0000-0000-0000000000c1'), ('ffffffff-0000-0000-0000-0000000000c2');
insert into public.wishlist_items (fragrance_id) values ('ffffffff-0000-0000-0000-0000000000c1');

reset role;
select throws_ok($$ select public.merge_fragrance('ffffffff-0000-0000-0000-0000000000c2', 'ffffffff-0000-0000-0000-0000000000c3') $$, 'P0001', null, 'only unverified entries are merged');
select lives_ok($$ select public.merge_fragrance('ffffffff-0000-0000-0000-0000000000c1', 'ffffffff-0000-0000-0000-0000000000c2') $$, 'the refresh job merges the unverified entry');
select is((select count(*)::int from public.fragrances where id = 'ffffffff-0000-0000-0000-0000000000c1'), 0, 'the unverified entry is gone');
select is((select count(*)::int from public.collection_items where user_id = 'aaaaaaaa-0000-0000-0000-0000000000c1' and fragrance_id = 'ffffffff-0000-0000-0000-0000000000c2'), 1, 'A''s bottle now points at the full entry');
select is((select count(*)::int from public.collection_items where user_id = 'bbbbbbbb-0000-0000-0000-0000000000c2'), 1, 'B, who had both, keeps one bottle');
select is((select count(*)::int from public.wear_logs where fragrance_id = 'ffffffff-0000-0000-0000-0000000000c2'), 1, 'wear history moves too');
select is((select pair_key from public.layering_experiments where user_id = 'aaaaaaaa-0000-0000-0000-0000000000c1'), 'ffffffff-0000-0000-0000-0000000000c2:ffffffff-0000-0000-0000-0000000000c3', 'the layering pair is re-keyed');

select * from finish();
rollback;
