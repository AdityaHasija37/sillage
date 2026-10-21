-- 0004 Budget alternatives (Q-01 → DEC-30): which pricier fragrance the community says this smells
-- like, and the user's choice to include such alternatives (default on).
alter table public.fragrances add column alternative_to jsonb;
alter table public.preferences add column include_alternatives boolean not null default true;
