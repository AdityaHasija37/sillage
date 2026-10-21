-- 0003 Explicit "marketed for" preference. Never inferred from ownership (DEC-09).
alter table public.preferences
  add column marketed_for text not null default 'any' check (marketed_for in ('any', 'men', 'women'));
