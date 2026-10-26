-- PRD 08 §12: Collection Intelligence tables are owner-only, children must point at the caller's
-- own parents, layering is limited to owned bottles, and analytics is write-only.
begin;
select plan(24);

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'a2@example.test'),
  ('bbbbbbbb-0000-0000-0000-00000000000b', 'b2@example.test');
insert into public.fragrances (id, provider, external_id, brand, name, canonical_key) values
  ('ffffffff-0000-0000-0000-0000000000a1', 'fixture', 'int-1', 'House', 'One', 'house::one'),
  ('ffffffff-0000-0000-0000-0000000000a2', 'fixture', 'int-2', 'House', 'Two', 'house::two'),
  ('ffffffff-0000-0000-0000-0000000000a3', 'fixture', 'int-3', 'House', 'Three', 'house::three');

create function pg_temp.as_user(uid uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;
create function pg_temp.as_anon() returns void language sql as $$
  select set_config('role', 'anon', true), set_config('request.jwt.claims', '{"role":"anon"}', true);
$$;

select ok((select bool_and(relrowsecurity) from pg_class where oid in ('public.wear_logs'::regclass, 'public.daily_pick_sessions'::regclass, 'public.daily_pick_feedback'::regclass, 'public.layering_experiments'::regclass, 'public.layering_feedback'::regclass, 'public.product_events'::regclass)), 'RLS on every intelligence table');

-- A owns One and Two
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-00000000000a');
insert into public.collection_items (fragrance_id) values ('ffffffff-0000-0000-0000-0000000000a1'), ('ffffffff-0000-0000-0000-0000000000a2');

select lives_ok($$ insert into public.wear_logs (fragrance_id, idempotency_key) values ('ffffffff-0000-0000-0000-0000000000a1', 'k1') $$, 'A logs a wear of an owned bottle');
select throws_ok($$ insert into public.wear_logs (fragrance_id, idempotency_key) values ('ffffffff-0000-0000-0000-0000000000a1', 'k1') $$, '23505', null, 'the same idempotency key cannot log twice (DS-05)');
select throws_ok($$ insert into public.wear_logs (fragrance_id) values ('ffffffff-0000-0000-0000-0000000000a3') $$, '42501', null, 'cannot log a wear of a bottle not owned');

select lives_ok($$ insert into public.daily_pick_sessions (id, algorithm_version) values ('cccccccc-0000-0000-0000-0000000000c1', 'daily-1.0') $$, 'A stores a selector session');
select lives_ok($$ insert into public.daily_pick_feedback (session_id, fragrance_id, action) values ('cccccccc-0000-0000-0000-0000000000c1', 'ffffffff-0000-0000-0000-0000000000a1', 'wore') $$, 'A records feedback');
select throws_ok($$ insert into public.daily_pick_feedback (session_id, fragrance_id, action) values ('cccccccc-0000-0000-0000-0000000000c1', 'ffffffff-0000-0000-0000-0000000000a1', 'wore') $$, '23505', null, 'duplicate feedback for the same pick is rejected');
select throws_ok($$ insert into public.daily_pick_feedback (session_id, fragrance_id, action, reason) values ('cccccccc-0000-0000-0000-0000000000c1', 'ffffffff-0000-0000-0000-0000000000a2', 'not_for_me', 'boring') $$, '23514', null, 'unknown feedback reason rejected');

select lives_ok($$ insert into public.layering_experiments (id, pair_key, fragrance_a_id, fragrance_b_id, prediction_json, algorithm_version)
  values ('dddddddd-0000-0000-0000-0000000000d1', 'ffffffff-0000-0000-0000-0000000000a1:ffffffff-0000-0000-0000-0000000000a2', 'ffffffff-0000-0000-0000-0000000000a1', 'ffffffff-0000-0000-0000-0000000000a2', '{"score":80}', 'lab-1.0') $$, 'A saves an experiment with two owned bottles');
select throws_ok($$ insert into public.layering_experiments (pair_key, fragrance_a_id, fragrance_b_id, prediction_json, algorithm_version)
  values ('ffffffff-0000-0000-0000-0000000000a1:ffffffff-0000-0000-0000-0000000000a3', 'ffffffff-0000-0000-0000-0000000000a1', 'ffffffff-0000-0000-0000-0000000000a3', '{}', 'lab-1.0') $$, '42501', null, 'cannot layer a bottle not owned (SL-01)');
select throws_ok($$ insert into public.layering_experiments (pair_key, fragrance_a_id, fragrance_b_id, prediction_json, algorithm_version)
  values ('ffffffff-0000-0000-0000-0000000000a1:ffffffff-0000-0000-0000-0000000000a1', 'ffffffff-0000-0000-0000-0000000000a1', 'ffffffff-0000-0000-0000-0000000000a1', '{}', 'lab-1.0') $$, '23514', null, 'the same bottle cannot fill both slots (SL-01)');
select lives_ok($$ insert into public.layering_feedback (experiment_id, rating, would_repeat) values ('dddddddd-0000-0000-0000-0000000000d1', 4, true) $$, 'A logs an observed result');
select throws_ok($$ insert into public.layering_feedback (experiment_id, rating) values ('dddddddd-0000-0000-0000-0000000000d1', 6) $$, '23514', null, 'rating must be 1–5');
select is((select prediction_json->>'score' from public.layering_experiments where id = 'dddddddd-0000-0000-0000-0000000000d1'), '80', 'feedback leaves the saved prediction unchanged (SL-05)');

select lives_ok($$ insert into public.product_events (name, properties) values ('collection_score_viewed', '{"collectionSize":2}') $$, 'A records an allowlisted event');
select throws_ok($$ insert into public.product_events (name) values ('location_shared') $$, '23514', null, 'unknown event names rejected');
select throws_ok($$ select * from public.product_events $$, '42501', null, 'events are write-only for users');

-- B sees and touches nothing of A's
select pg_temp.as_user('bbbbbbbb-0000-0000-0000-00000000000b');
select is((select count(*)::int from public.wear_logs) + (select count(*)::int from public.daily_pick_sessions) + (select count(*)::int from public.layering_experiments) + (select count(*)::int from public.layering_feedback), 0, 'B reads none of A''s logs, sessions, experiments or feedback');
select throws_ok($$ insert into public.layering_feedback (experiment_id, rating) values ('dddddddd-0000-0000-0000-0000000000d1', 1) $$, '42501', null, 'B cannot add feedback to A''s experiment');
select throws_ok($$ insert into public.daily_pick_feedback (session_id, fragrance_id, action) values ('cccccccc-0000-0000-0000-0000000000c1', 'ffffffff-0000-0000-0000-0000000000a2', 'wore') $$, '42501', null, 'B cannot add feedback to A''s session');
delete from public.layering_experiments where id = 'dddddddd-0000-0000-0000-0000000000d1';

select pg_temp.as_anon();
select throws_ok($$ select * from public.layering_experiments $$, '42501', null, 'anon cannot read experiments');

select pg_temp.as_user('aaaaaaaa-0000-0000-0000-00000000000a');
select is((select count(*)::int from public.layering_experiments), 1, 'B''s delete affected nothing');

-- Today's AI explanation has its own metered bucket; unknown buckets are still rejected.
reset role;
select ok(public.claim_rate('explain', '00000000-0000-4000-8000-0000000000aa', 2, 3600), 'the explain bucket is accepted');
select throws_ok($$ select public.claim_rate('anything', '00000000-0000-4000-8000-0000000000aa', 2, 3600) $$, '23514', null, 'unknown rate buckets are rejected');

select * from finish();
rollback;
