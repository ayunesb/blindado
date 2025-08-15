-- Consolidation migration: ensure schema and RLS per demo requirements
-- Idempotent and safe for existing deployments

-- profiles: add email if missing
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='profiles' and column_name='email'
  ) then
    alter table public.profiles add column email text;
  end if;
end $$;

-- companies: add admin_email if missing
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='companies' and column_name='admin_email'
  ) then
    alter table public.companies add column admin_email text;
  end if;
end $$;

-- guards: add name/text status if missing
do $$ begin
  if not exists (
    select 1 from information_schema.columns where table_schema='public' and table_name='guards' and column_name='name'
  ) then
    alter table public.guards add column name text;
  end if;
  if not exists (
    select 1 from information_schema.columns where table_schema='public' and table_name='guards' and column_name='status'
  ) then
    alter table public.guards add column status text;
  end if;
end $$;

-- vehicles: add armored boolean if missing; backfill from type
do $$ begin
  if not exists (
    select 1 from information_schema.columns where table_schema='public' and table_name='vehicles' and column_name='armored'
  ) then
    alter table public.vehicles add column armored boolean default false;
    update public.vehicles set armored = true where lower(coalesce(type,'')) like '%armored%';
  end if;
end $$;

-- bookings: ensure required columns
alter table public.bookings
  add column if not exists pickup_address text,
  add column if not exists dress_code text,
  add column if not exists protectees int,
  add column if not exists protectors int,
  add column if not exists vehicles int,
  add column if not exists origin_lat double precision,
  add column if not exists origin_lng double precision;

-- payouts table (if missing)
create table if not exists public.payouts (
  booking_id uuid references public.bookings(id) on delete cascade,
  taxes numeric,
  platform_fee numeric,
  freelancer_amount numeric,
  company_amount numeric,
  currency text,
  status text,
  created_at timestamptz default now()
);

-- locations table (optional heartbeat history)
create table if not exists public.locations (
  assignment_id uuid,
  lat double precision,
  lng double precision,
  ts timestamptz default now()
);

-- Indexes
create index if not exists idx_bookings_start_ts on public.bookings(start_ts);

-- RLS policies (drop/create)
-- profiles: self view/update
alter table public.profiles enable row level security;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_select_self') THEN
    EXECUTE 'drop policy "profiles_select_self" on public.profiles';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_update_self') THEN
    EXECUTE 'drop policy "profiles_update_self" on public.profiles';
  END IF;
  EXECUTE 'create policy "profiles_select_self" on public.profiles for select using (auth.uid() = user_id)';
  EXECUTE 'create policy "profiles_update_self" on public.profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id)';
END $$;

-- companies: admins manage own
alter table public.companies enable row level security;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='companies' AND policyname='company_admins_manage_own') THEN
    EXECUTE 'drop policy "company_admins_manage_own" on public.companies';
  END IF;
  EXECUTE 'create policy "company_admins_manage_own" on public.companies for all using (id = (select company_id from public.profiles where user_id = auth.uid())) with check (id = (select company_id from public.profiles where user_id = auth.uid()))';
END $$;

-- guards: owner read; company admin manage
alter table public.guards enable row level security;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='guards' AND policyname='guards_read_owner_or_company') THEN
    EXECUTE 'drop policy "guards_read_owner_or_company" on public.guards';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='guards' AND policyname='guards_write_company') THEN
    EXECUTE 'drop policy "guards_write_company" on public.guards';
  END IF;
  EXECUTE 'create policy "guards_read_owner_or_company" on public.guards for select using ((user_id = auth.uid()) or (company_id = (select company_id from public.profiles where user_id = auth.uid())))';
  EXECUTE 'create policy "guards_write_company" on public.guards for all using (company_id = (select company_id from public.profiles where user_id = auth.uid())) with check (company_id = (select company_id from public.profiles where user_id = auth.uid()))';
END $$;

-- vehicles: company manage
alter table public.vehicles enable row level security;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='vehicles' AND policyname='vehicles_manage_company') THEN
    EXECUTE 'drop policy "vehicles_manage_company" on public.vehicles';
  END IF;
  EXECUTE 'create policy "vehicles_manage_company" on public.vehicles for all using (company_id = (select company_id from public.profiles where user_id = auth.uid())) with check (company_id = (select company_id from public.profiles where user_id = auth.uid()))';
END $$;

-- bookings: client read own
alter table public.bookings enable row level security;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='bookings' AND policyname='bookings_read_own') THEN
    EXECUTE 'drop policy "bookings_read_own" on public.bookings';
  END IF;
  EXECUTE 'create policy "bookings_read_own" on public.bookings for select using (client_id = auth.uid())';
END $$;

-- jobs & locations: guards see own assignment rows (if tables exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='jobs') THEN
    ALTER TABLE public.jobs enable row level security;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='jobs' AND policyname='jobs_read_guard') THEN
      EXECUTE 'drop policy "jobs_read_guard" on public.jobs';
    END IF;
    EXECUTE 'create policy "jobs_read_guard" on public.jobs for select using (guard_id = auth.uid())';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='locations') THEN
    ALTER TABLE public.locations enable row level security;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='locations' AND policyname='locations_read_guard') THEN
      EXECUTE 'drop policy "locations_read_guard" on public.locations';
    END IF;
    EXECUTE 'create policy "locations_read_guard" on public.locations for select using (exists (select 1 from public.assignments a where a.id = assignment_id and a.guard_id = auth.uid()))';
  END IF;
END $$;
