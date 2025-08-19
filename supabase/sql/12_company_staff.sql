-- Company staff + vehicle document tables (idempotent)
create table if not exists public.company_staff (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  name text,
  email text,
  address text,
  id_doc_url text,
  gun_permit_url text,
  driver_license_url text,
  photo_formal_url text,
  photo_casual_url text,
  status text check (status in ('pending_review','active','suspended','rejected')) default 'pending_review',
  created_at timestamptz default now()
);

create table if not exists public.company_vehicle_docs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  type text,
  make text,
  model text,
  plate text,
  armored_level text,
  photo_url text,
  registration_url text,
  insurance_url text,
  status text default 'active',
  created_at timestamptz default now()
);

-- RLS
alter table public.company_staff enable row level security;
alter table public.company_vehicle_docs enable row level security;

-- Policies: company admins manage own rows
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='company_staff' and policyname='company staff manage'
  ) then
    create policy "company staff manage" on public.company_staff
      for all
      using (company_id = (select company_id from public.profiles where user_id = auth.uid()))
      with check (company_id = (select company_id from public.profiles where user_id = auth.uid()));
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='company_vehicle_docs' and policyname='company vehicle docs manage'
  ) then
    create policy "company vehicle docs manage" on public.company_vehicle_docs
      for all
      using (company_id = (select company_id from public.profiles where user_id = auth.uid()))
      with check (company_id = (select company_id from public.profiles where user_id = auth.uid()));
  end if;
end $$;
