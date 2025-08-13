-- 02_policies.sql
alter table public.profiles enable row level security;
alter table public.bookings enable row level security;
alter table public.assignments enable row level security;
alter table public.payments enable row level security;

-- Profiles: self select/update; admins all
do $$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles_self_select') then
    drop policy "profiles_self_select" on public.profiles;
  end if;
end $$;
create policy "profiles_self_select" on public.profiles
for select using ( id = auth.uid() );

do $$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles_self_update') then
    drop policy "profiles_self_update" on public.profiles;
  end if;
end $$;
create policy "profiles_self_update" on public.profiles
for update using ( id = auth.uid() );

-- Bookings: client can read own + guards assigned
do $$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='bookings' and policyname='bookings_client_read') then
    drop policy "bookings_client_read" on public.bookings;
  end if;
end $$;
create policy "bookings_client_read" on public.bookings
for select using (
  client_id = auth.uid()
  or exists(select 1 from public.assignments a where a.booking_id = bookings.id and a.guard_id = auth.uid())
);

do $$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='bookings' and policyname='bookings_client_insert') then
    drop policy "bookings_client_insert" on public.bookings;
  end if;
end $$;
create policy "bookings_client_insert" on public.bookings
for insert with check ( client_id = auth.uid() );
