-- Recommended hardening for public.food_cache
--
-- Why:
-- The cache is shared across all users, so allowing authenticated clients to
-- write directly can poison nutrition data for everyone.
--
-- Safer model:
-- - authenticated users can read
-- - only service role / backend jobs write
--
-- Note:
-- Supabase service_role bypasses RLS, so removing client write policies is
-- enough if writes are moved server-side later.

alter table public.food_cache enable row level security;

drop policy if exists "Authenticated users can insert cache" on public.food_cache;
drop policy if exists "Authenticated users can insert food_cache" on public.food_cache;
drop policy if exists "Authenticated users can read cache" on public.food_cache;
drop policy if exists "Authenticated users can read food_cache" on public.food_cache;
drop policy if exists "Authenticated users can update cache" on public.food_cache;
drop policy if exists "Authenticated users can update food_cache" on public.food_cache;
drop policy if exists "Authenticated users can delete cache" on public.food_cache;
drop policy if exists "Authenticated users can delete food_cache" on public.food_cache;

create policy "Authenticated users can read food_cache"
  on public.food_cache
  for select
  to authenticated
  using (true);

comment on table public.food_cache is
  'Shared cache for product nutrition data. Client reads allowed. Client writes disabled to avoid shared cache poisoning.';
