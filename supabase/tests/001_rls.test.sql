-- SEC-01 / SEC-02 at the database layer: anon, user A, user B. Every user-owned table is checked.
begin;
select plan(38);

-- Fixtures (as postgres) -------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@example.test', '{"display_name":"Alex"}'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'b@example.test', '{}');
insert into public.fragrances (id, provider, external_id, brand, name, canonical_key) values
  ('ffffffff-0000-0000-0000-000000000001', 'fixture', 'rls-1', 'House', 'One', 'house::one'),
  ('ffffffff-0000-0000-0000-000000000002', 'fixture', 'rls-2', 'House', 'Two', 'house::two');

create function pg_temp.as_user(uid uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;
create function pg_temp.as_anon() returns void language sql as $$
  select set_config('role', 'anon', true), set_config('request.jwt.claims', '{"role":"anon"}', true);
$$;

-- Structure ---------------------------------------------------------------
select ok((select bool_and(relrowsecurity) from pg_class where oid in (
  'public.profiles'::regclass, 'public.preferences'::regclass, 'public.collection_items'::regclass, 'public.wishlist_items'::regclass,
  'public.recommendation_runs'::regclass, 'public.recommendation_feedback'::regclass, 'public.chat_sessions'::regclass,
  'public.chat_messages'::regclass, 'public.fragrances'::regclass, 'public.variants'::regclass, 'public.offer_snapshots'::regclass,
  'public.rate_counters'::regclass, 'public.demo_accounts'::regclass)), 'RLS enabled on every table');
select is((select display_name from public.profiles where user_id = 'aaaaaaaa-0000-0000-0000-000000000001'), 'Alex', 'profile created on sign-up');
select is((select count(*)::int from public.preferences where user_id = 'aaaaaaaa-0000-0000-0000-000000000001'), 1, 'preferences row created on sign-up');

-- User A creates data -----------------------------------------------------
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select lives_ok($$ insert into public.collection_items (fragrance_id, sentiment) values ('ffffffff-0000-0000-0000-000000000001', 'love') $$, 'A adds to collection');
select is((select user_id from public.collection_items limit 1), 'aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'user_id defaults to the caller');
select throws_ok($$ insert into public.collection_items (fragrance_id) values ('ffffffff-0000-0000-0000-000000000001') $$, '23505', null, 'duplicate collection item rejected (COL-02)');
select lives_ok($$ insert into public.collection_items (fragrance_id) values ('ffffffff-0000-0000-0000-000000000002') $$, 'unrated item allowed: ownership does not imply sentiment');
select is((select sentiment from public.collection_items where fragrance_id = 'ffffffff-0000-0000-0000-000000000002'), null, 'sentiment stays null until set');
select throws_ok($$ insert into public.collection_items (fragrance_id, sentiment) values ('ffffffff-0000-0000-0000-000000000002', 'adore') $$, '23514', null, 'unknown sentiment rejected');
select lives_ok($$ insert into public.wishlist_items (fragrance_id) values ('ffffffff-0000-0000-0000-000000000002') $$, 'A adds to wishlist');
select lives_ok($$ update public.preferences set disliked_notes = '["oud"]' $$, 'A updates own preferences');
select lives_ok($$ insert into public.recommendation_runs (id, mode, engine_version) values ('cccccccc-0000-0000-0000-000000000001', 'gaps', 'test') $$, 'A logs a recommendation run');
select lives_ok($$ insert into public.recommendation_feedback (run_id, fragrance_id, reaction) values ('cccccccc-0000-0000-0000-000000000001', 'ffffffff-0000-0000-0000-000000000001', 'relevant') $$, 'A leaves feedback on own run (FDBK-01)');
select lives_ok($$ insert into public.chat_sessions (id) values ('dddddddd-0000-0000-0000-000000000001') $$, 'A starts a chat');
select lives_ok($$ insert into public.chat_messages (session_id, role, content) values ('dddddddd-0000-0000-0000-000000000001', 'user', 'hello') $$, 'A writes to own chat');
select ok((select public.ensure_variant('ffffffff-0000-0000-0000-000000000001', 'EDP', 100)) is not null, 'signed-in user can resolve a variant');
select throws_ok($$ select public.ensure_variant('ffffffff-0000-0000-0000-000000000001', 'EAU', 100) $$, '22023', null, 'invalid variant rejected');

-- Shared catalog is read-only to users --------------------------------------
select is((select count(*)::int from public.fragrances where provider = 'fixture'), 2, 'catalog is readable');
select throws_ok($$ insert into public.fragrances (provider, external_id, brand, name, canonical_key) values ('fixture', 'x', 'X', 'X', 'x') $$, '42501', null, 'users cannot insert catalog rows');
select throws_ok($$ update public.fragrances set name = 'Hacked' $$, '42501', null, 'users cannot edit catalog rows');
select throws_ok($$ insert into public.offer_snapshots (variant_id, provider, merchant, title, item_url, list_price, match_status, expires_at)
  select id, 'sample', 'M', 'T', 'https://x.example', 1, 'exact', now() from public.variants limit 1 $$, '42501', null, 'users cannot write offer snapshots');
select throws_ok($$ select * from public.rate_counters $$, '42501', null, 'users cannot read rate counters');
select throws_ok($$ select public.claim_rate('chat', 'aaaaaaaa-0000-0000-0000-000000000001', 1, 60) $$, '42501', null, 'users cannot call the rate limiter');
select throws_ok($$ select * from public.demo_accounts $$, '42501', null, 'users cannot list demo accounts');

-- User B sees and changes nothing of A's (SEC-01) ---------------------------
select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000002');
select is((select count(*)::int from public.collection_items), 0, 'B cannot read A collection');
select is((select count(*)::int from public.wishlist_items), 0, 'B cannot read A wishlist');
select is((select count(*)::int from public.preferences), 1, 'B reads only own preferences');
select is((select count(*)::int from public.recommendation_runs), 0, 'B cannot read A runs');
select is((select count(*)::int from public.chat_messages), 0, 'B cannot read A chats');
update public.collection_items set sentiment = 'dislike';
delete from public.wishlist_items;
select throws_ok($$ insert into public.collection_items (user_id, fragrance_id) values ('aaaaaaaa-0000-0000-0000-000000000001', 'ffffffff-0000-0000-0000-000000000002') $$, '42501', null, 'B cannot insert into A collection');
select throws_ok($$ insert into public.recommendation_feedback (run_id, fragrance_id, reaction) values ('cccccccc-0000-0000-0000-000000000001', 'ffffffff-0000-0000-0000-000000000002', 'not_relevant') $$, '42501', null, 'B cannot leave feedback on A run');
select throws_ok($$ insert into public.chat_messages (session_id, role, content) values ('dddddddd-0000-0000-0000-000000000001', 'user', 'injected') $$, '42501', null, 'B cannot write into A chat');

-- Anonymous: catalog only --------------------------------------------------
select pg_temp.as_anon();
select is((select count(*)::int from public.fragrances where provider = 'fixture'), 2, 'anon can read the catalog');
select throws_ok($$ select * from public.collection_items $$, '42501', null, 'anon cannot read collections');
select throws_ok($$ select * from public.chat_messages $$, '42501', null, 'anon cannot read chats');
select throws_ok($$ select public.ensure_variant('ffffffff-0000-0000-0000-000000000001', 'EDP', 50) $$, '42501', null, 'anon cannot create variants');

-- Back as A: B's update/delete had no effect --------------------------------
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select is((select sentiment from public.collection_items where fragrance_id = 'ffffffff-0000-0000-0000-000000000001'), 'love', 'B update affected nothing');
select is((select count(*)::int from public.wishlist_items), 1, 'B delete affected nothing');

select * from finish();
rollback;
