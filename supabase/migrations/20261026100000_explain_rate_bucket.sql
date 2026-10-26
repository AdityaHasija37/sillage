-- Today's AI-written explanation gets its own rate bucket (it re-runs on every chip change).
alter table public.rate_counters drop constraint if exists rate_counters_bucket_check;
alter table public.rate_counters add constraint rate_counters_bucket_check
  check (bucket in ('chat', 'offers', 'catalog_live', 'demo', 'explain'));
