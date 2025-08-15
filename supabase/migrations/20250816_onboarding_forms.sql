-- roles come from auth.users; profiles carry role
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role text check (role in ('client','freelancer','company_admin','admin')) default 'client',
  company_id uuid null,
  created_at timestamptz default now()
);

-- Ensure columns exist on legacy deployments
do $$ begin
  if not exists (
    select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='company_id'
  ) then
    alter table public.profiles add column company_id uuid null;
  end if;
end $$;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tax_id text,
  contact_name text,
  contact_email text,
  contact_phone text,
  cities text[] default '{}',
  status text check (status in ('pending_review','active','suspended')) default 'pending_review',
  stripe_account_id text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table if not exists public.guards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  company_id uuid references public.companies(id),
  first_name text,
  last_name text,
  armed boolean default false,
  dress_codes text[] default '{Business Formal,Business Casual,Tactical Casual}',
  hourly_rate numeric(10,2) default 0,
  photo_url text,
  status text check (status in ('pending_review','active','unavailable','suspended')) default 'pending_review',
  created_at timestamptz default now()
);

-- Ensure columns exist on legacy guards table
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='guards') then
    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='guards' and column_name='user_id') then
      alter table public.guards add column user_id uuid;
    end if;
    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='guards' and column_name='company_id') then
      alter table public.guards add column company_id uuid;
    end if;
    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='guards' and column_name='photo_url') then
      alter table public.guards add column photo_url text;
    end if;
    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='guards' and column_name='hourly_rate') then
      alter table public.guards add column hourly_rate numeric(10,2);
    end if;
    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='guards' and column_name='dress_codes') then
      alter table public.guards add column dress_codes text[];
    end if;
    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='guards' and column_name='status') then
      alter table public.guards add column status text;
    end if;
  end if;
end $$;

create table if not exists public.guard_documents (
  id uuid primary key default gen_random_uuid(),
  guard_id uuid references public.guards(id) on delete cascade,
  doc_type text, -- 'license','id','training','permit'
  url text,
  verified_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  type text check (type in ('none','suv','armored','sedan')) default 'suv',
  plate text,
  capacity int default 5,
  photo_url text,
  status text check (status in ('active','maintenance','retired')) default 'active',
  created_at timestamptz default now()
);

-- Ensure vehicles has company_id on legacy deployments
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='vehicles') then
    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='vehicles' and column_name='company_id') then
      alter table public.vehicles add column company_id uuid;
    end if;
  end if;
end $$;

-- RLS
alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.guards enable row level security;
alter table public.guard_documents enable row level security;
alter table public.vehicles enable row level security;

do $$
declare key_col text;
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='user_id') then
    key_col := 'user_id';
  elsif exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='id') then
    key_col := 'id';
  else
    raise notice 'profiles has no user identifier column';
    return;
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles select self'
  ) then
    execute format('create policy %I on public.profiles for select using (auth.uid() = %I);', 'profiles select self', key_col);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles update self'
  ) then
    execute format('create policy %I on public.profiles for update using (auth.uid() = %I) with check (auth.uid() = %I);', 'profiles update self', key_col, key_col);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles insert self'
  ) then
    execute format('create policy %I on public.profiles for insert with check (auth.uid() = %I);', 'profiles insert self', key_col);
  end if;
end $$;

-- Companies: company_admin tied via profiles.company_id may read/write their own company
do $$
declare key_col text; has_company boolean;
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='user_id') then
    key_col := 'user_id';
  elsif exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='id') then
    key_col := 'id';
  else
    raise notice 'profiles has no user identifier column';
    return;
  end if;

  select exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='company_id') into has_company;
  if not has_company then
    raise notice 'profiles.company_id not found; skipping companies policy';
    return;
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='companies' and policyname='company admins manage own company'
  ) then
    execute format('create policy %I on public.companies for all using (id = (select company_id from public.profiles where %I = auth.uid())) with check (id = (select company_id from public.profiles where %I = auth.uid()));',
      'company admins manage own company', key_col, key_col);
  end if;
end $$;

-- Guards: company_admins may manage guards under their company; freelancers (user_id owner) may read self
do $$
declare key_col text; has_company boolean; guards_has_user boolean; guards_has_company boolean;
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='user_id') then
    key_col := 'user_id';
  elsif exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='id') then
    key_col := 'id';
  else
    raise notice 'profiles has no user identifier column';
    return;
  end if;

  select exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='company_id') into has_company;
  select exists (select 1 from information_schema.columns where table_schema='public' and table_name='guards' and column_name='user_id') into guards_has_user;
  select exists (select 1 from information_schema.columns where table_schema='public' and table_name='guards' and column_name='company_id') into guards_has_company;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='guards' and policyname='guards readable by owner or company admin'
  ) then
    if guards_has_user and has_company and guards_has_company then
      execute format('create policy %I on public.guards for select using ((user_id = auth.uid()) or (company_id = (select company_id from public.profiles where %I = auth.uid())));',
        'guards readable by owner or company admin', key_col);
    elsif guards_has_user then
      execute 'create policy "guards readable by owner" on public.guards for select using (user_id = auth.uid())';
    elsif has_company and guards_has_company then
      execute format('create policy %I on public.guards for select using (company_id = (select company_id from public.profiles where %I = auth.uid()));',
        'guards readable by company admin', key_col);
    else
      raise notice 'guards has neither user_id nor company_id; skipping guards read policy';
    end if;
  end if;
end $$;

do $$
declare key_col text; has_company boolean; guards_has_company boolean;
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='user_id') then
    key_col := 'user_id';
  elsif exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='id') then
    key_col := 'id';
  else
    raise notice 'profiles has no user identifier column';
    return;
  end if;

  select exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='company_id') into has_company;
  select exists (select 1 from information_schema.columns where table_schema='public' and table_name='guards' and column_name='company_id') into guards_has_company;

  if has_company and guards_has_company then
    if not exists (
      select 1 from pg_policies where schemaname='public' and tablename='guards' and policyname='guards write by company admin'
    ) then
      execute format('create policy %I on public.guards for insert with check (company_id = (select company_id from public.profiles where %I = auth.uid()));',
        'guards write by company admin', key_col);
    end if;

    if not exists (
      select 1 from pg_policies where schemaname='public' and tablename='guards' and policyname='guards update by company admin'
    ) then
      execute format('create policy %I on public.guards for update using (company_id = (select company_id from public.profiles where %I = auth.uid()));',
        'guards update by company admin', key_col);
    end if;
  else
    raise notice 'profiles.company_id or guards.company_id not found; skipping guards company admin policies';
  end if;
end $$;

-- Guard documents: owner (via guard->user) or company admin can manage
do $$
declare key_col text; has_company boolean; guards_has_user boolean; guards_has_company boolean;
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='user_id') then
    key_col := 'user_id';
  elsif exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='id') then
    key_col := 'id';
  else
    raise notice 'profiles has no user identifier column';
    return;
  end if;

  select exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='company_id') into has_company;
  select exists (select 1 from information_schema.columns where table_schema='public' and table_name='guards' and column_name='user_id') into guards_has_user;
  select exists (select 1 from information_schema.columns where table_schema='public' and table_name='guards' and column_name='company_id') into guards_has_company;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='guard_documents' and policyname='guard docs read'
  ) then
    if has_company and guards_has_company and guards_has_user then
      execute format('create policy %I on public.guard_documents for select using (exists (select 1 from public.guards g where g.id = guard_id and (g.user_id = auth.uid() or g.company_id = (select company_id from public.profiles where %I = auth.uid()))));',
        'guard docs read', key_col);
    elsif guards_has_user then
      execute 'create policy "guard docs read owner" on public.guard_documents for select using (exists (select 1 from public.guards g where g.id = guard_id and g.user_id = auth.uid()))';
    elsif has_company and guards_has_company then
      execute format('create policy %I on public.guard_documents for select using (exists (select 1 from public.guards g where g.id = guard_id and g.company_id = (select company_id from public.profiles where %I = auth.uid())));',
        'guard docs read by company', key_col);
    else
      raise notice 'guards has neither user_id nor company_id; skipping guard_documents read policy';
    end if;
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='guard_documents' and policyname='guard docs write'
  ) then
    if has_company and guards_has_company then
      execute format('create policy %I on public.guard_documents for all using (exists (select 1 from public.guards g where g.id = guard_id and g.company_id = (select company_id from public.profiles where %I = auth.uid()))) with check (exists (select 1 from public.guards g where g.id = guard_id and g.company_id = (select company_id from public.profiles where %I = auth.uid())));',
        'guard docs write', key_col, key_col);
    elsif guards_has_user then
      execute 'create policy "guard docs write owner" on public.guard_documents for all using (exists (select 1 from public.guards g where g.id = guard_id and g.user_id = auth.uid())) with check (exists (select 1 from public.guards g where g.id = guard_id and g.user_id = auth.uid()))';
    else
      raise notice 'guards has neither user_id nor company_id; skipping guard_documents write policy';
    end if;
  end if;
end $$;

-- Vehicles: company admins manage own vehicles
do $$
declare key_col text; has_company boolean; vehicles_has_company boolean;
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='user_id') then
    key_col := 'user_id';
  elsif exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='id') then
    key_col := 'id';
  else
    raise notice 'profiles has no user identifier column';
    return;
  end if;

  select exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='company_id') into has_company;
  select exists (select 1 from information_schema.columns where table_schema='public' and table_name='vehicles' and column_name='company_id') into vehicles_has_company;
  if not has_company or not vehicles_has_company then
    raise notice 'profiles.company_id or vehicles.company_id not found; skipping vehicles policy';
    return;
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='vehicles' and policyname='vehicles manage'
  ) then
    execute format('create policy %I on public.vehicles for all using (company_id = (select company_id from public.profiles where %I = auth.uid())) with check (company_id = (select company_id from public.profiles where %I = auth.uid()));',
      'vehicles manage', key_col, key_col);
  end if;
end $$;

-- Helpful indexes (guarded for legacy schemas)
create index if not exists idx_companies_created_at on public.companies(created_at desc);
do $$ begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='guards' and column_name='company_id') then
  create index if not exists idx_guards_company on public.guards(company_id);
  end if;
end $$;
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='guard_documents') then
    create index if not exists idx_guard_docs_guard on public.guard_documents(guard_id);
  end if;
end $$;
do $$ begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='vehicles' and column_name='company_id') then
    create index if not exists idx_vehicles_company on public.vehicles(company_id);
  end if;
end $$;
-- MIGRATION VERSION 20250816: onboarding forms and policies
-- roles come from auth.users; profiles carry role
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role text check (role in ('client','freelancer','company_admin','admin')) default 'client',
  company_id uuid null,
  created_at timestamptz default now()
);

-- Ensure columns exist on legacy deployments
do $$ begin
  if not exists (
    select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='company_id'
  ) then
    alter table public.profiles add column company_id uuid null;
  end if;
end $$;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tax_id text,
  contact_name text,
  contact_email text,
  contact_phone text,
  cities text[] default '{}',
  status text check (status in ('pending_review','active','suspended')) default 'pending_review',
  stripe_account_id text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table if not exists public.guards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  company_id uuid references public.companies(id),
  first_name text,
  last_name text,
  armed boolean default false,
  dress_codes text[] default '{Business Formal,Business Casual,Tactical Casual}',
  hourly_rate numeric(10,2) default 0,
  photo_url text,
  status text check (status in ('pending_review','active','unavailable','suspended')) default 'pending_review',
  created_at timestamptz default now()
);

-- Ensure columns exist on legacy guards table
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='guards') then
    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='guards' and column_name='user_id') then
      alter table public.guards add column user_id uuid;
    end if;
    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='guards' and column_name='company_id') then
      alter table public.guards add column company_id uuid;
    end if;
    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='guards' and column_name='photo_url') then
      alter table public.guards add column photo_url text;
    end if;
    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='guards' and column_name='hourly_rate') then
      alter table public.guards add column hourly_rate numeric(10,2);
    end if;
    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='guards' and column_name='dress_codes') then
      alter table public.guards add column dress_codes text[];
    end if;
    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='guards' and column_name='status') then
      alter table public.guards add column status text;
    end if;
  end if;
end $$;

create table if not exists public.guard_documents (
  id uuid primary key default gen_random_uuid(),
  guard_id uuid references public.guards(id) on delete cascade,
  doc_type text, -- 'license','id','training','permit'
  url text,
  verified_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  type text check (type in ('none','suv','armored','sedan')) default 'suv',
  plate text,
  capacity int default 5,
  photo_url text,
  status text check (status in ('active','maintenance','retired')) default 'active',
  created_at timestamptz default now()
);

-- Ensure vehicles has company_id on legacy deployments
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='vehicles') then
    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='vehicles' and column_name='company_id') then
      alter table public.vehicles add column company_id uuid;
    end if;
  end if;
end $$;

-- RLS
alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.guards enable row level security;
alter table public.guard_documents enable row level security;
alter table public.vehicles enable row level security;

do $$
declare key_col text;
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='user_id') then
    key_col := 'user_id';
  elsif exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='id') then
    key_col := 'id';
  else
    raise notice 'profiles has no user identifier column';
    return;
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles select self'
  ) then
    execute format('create policy %I on public.profiles for select using (auth.uid() = %I);', 'profiles select self', key_col);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles update self'
  ) then
    execute format('create policy %I on public.profiles for update using (auth.uid() = %I) with check (auth.uid() = %I);', 'profiles update self', key_col, key_col);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles insert self'
  ) then
    execute format('create policy %I on public.profiles for insert with check (auth.uid() = %I);', 'profiles insert self', key_col);
  end if;
end $$;

-- Companies: company_admin tied via profiles.company_id may read/write their own company
do $$
declare key_col text; has_company boolean;
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='user_id') then
    key_col := 'user_id';
  elsif exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='id') then
    key_col := 'id';
  else
    raise notice 'profiles has no user identifier column';
    return;
  end if;

  select exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='company_id') into has_company;
  if not has_company then
    raise notice 'profiles.company_id not found; skipping companies policy';
    return;
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='companies' and policyname='company admins manage own company'
  ) then
    execute format('create policy %I on public.companies for all using (id = (select company_id from public.profiles where %I = auth.uid())) with check (id = (select company_id from public.profiles where %I = auth.uid()));',
      'company admins manage own company', key_col, key_col);
  end if;
end $$;

-- Guards: company_admins may manage guards under their company; freelancers (user_id owner) may read self
do $$
declare key_col text; has_company boolean; guards_has_user boolean; guards_has_company boolean;
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='user_id') then
    key_col := 'user_id';
  elsif exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='id') then
    key_col := 'id';
  else
    raise notice 'profiles has no user identifier column';
    return;
  end if;

  select exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='company_id') into has_company;
  select exists (select 1 from information_schema.columns where table_schema='public' and table_name='guards' and column_name='user_id') into guards_has_user;
  select exists (select 1 from information_schema.columns where table_schema='public' and table_name='guards' and column_name='company_id') into guards_has_company;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='guards' and policyname='guards readable by owner or company admin'
  ) then
    if guards_has_user and has_company and guards_has_company then
      execute format('create policy %I on public.guards for select using ((user_id = auth.uid()) or (company_id = (select company_id from public.profiles where %I = auth.uid())));',
        'guards readable by owner or company admin', key_col);
    elsif guards_has_user then
      execute 'create policy "guards readable by owner" on public.guards for select using (user_id = auth.uid())';
    elsif has_company and guards_has_company then
      execute format('create policy %I on public.guards for select using (company_id = (select company_id from public.profiles where %I = auth.uid()));',
        'guards readable by company admin', key_col);
    else
      raise notice 'guards has neither user_id nor company_id; skipping guards read policy';
    end if;
  end if;
end $$;

do $$
declare key_col text; has_company boolean; guards_has_company boolean;
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='user_id') then
    key_col := 'user_id';
  elsif exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='id') then
    key_col := 'id';
  else
    raise notice 'profiles has no user identifier column';
    return;
  end if;

  select exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='company_id') into has_company;
  select exists (select 1 from information_schema.columns where table_schema='public' and table_name='guards' and column_name='company_id') into guards_has_company;

  if has_company and guards_has_company then
    if not exists (
      select 1 from pg_policies where schemaname='public' and tablename='guards' and policyname='guards write by company admin'
    ) then
      execute format('create policy %I on public.guards for insert with check (company_id = (select company_id from public.profiles where %I = auth.uid()));',
        'guards write by company admin', key_col);
    end if;

    if not exists (
      select 1 from pg_policies where schemaname='public' and tablename='guards' and policyname='guards update by company admin'
    ) then
      execute format('create policy %I on public.guards for update using (company_id = (select company_id from public.profiles where %I = auth.uid()));',
        'guards update by company admin', key_col);
    end if;
  else
    raise notice 'profiles.company_id or guards.company_id not found; skipping guards company admin policies';
  end if;
end $$;

-- Guard documents: owner (via guard->user) or company admin can manage
do $$
declare key_col text; has_company boolean; guards_has_user boolean; guards_has_company boolean;
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='user_id') then
    key_col := 'user_id';
  elsif exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='id') then
    key_col := 'id';
  else
    raise notice 'profiles has no user identifier column';
    return;
  end if;

  select exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='company_id') into has_company;
  select exists (select 1 from information_schema.columns where table_schema='public' and table_name='guards' and column_name='user_id') into guards_has_user;
  select exists (select 1 from information_schema.columns where table_schema='public' and table_name='guards' and column_name='company_id') into guards_has_company;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='guard_documents' and policyname='guard docs read'
  ) then
    if has_company and guards_has_company and guards_has_user then
      execute format('create policy %I on public.guard_documents for select using (exists (select 1 from public.guards g where g.id = guard_id and (g.user_id = auth.uid() or g.company_id = (select company_id from public.profiles where %I = auth.uid()))));',
        'guard docs read', key_col);
    elsif guards_has_user then
      execute 'create policy "guard docs read owner" on public.guard_documents for select using (exists (select 1 from public.guards g where g.id = guard_id and g.user_id = auth.uid()))';
    elsif has_company and guards_has_company then
      execute format('create policy %I on public.guard_documents for select using (exists (select 1 from public.guards g where g.id = guard_id and g.company_id = (select company_id from public.profiles where %I = auth.uid())));',
        'guard docs read by company', key_col);
    else
      raise notice 'guards has neither user_id nor company_id; skipping guard_documents read policy';
    end if;
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='guard_documents' and policyname='guard docs write'
  ) then
    if has_company and guards_has_company then
      execute format('create policy %I on public.guard_documents for all using (exists (select 1 from public.guards g where g.id = guard_id and g.company_id = (select company_id from public.profiles where %I = auth.uid()))) with check (exists (select 1 from public.guards g where g.id = guard_id and g.company_id = (select company_id from public.profiles where %I = auth.uid())));',
        'guard docs write', key_col, key_col);
    elsif guards_has_user then
      execute 'create policy "guard docs write owner" on public.guard_documents for all using (exists (select 1 from public.guards g where g.id = guard_id and g.user_id = auth.uid())) with check (exists (select 1 from public.guards g where g.id = guard_id and g.user_id = auth.uid()))';
    else
      raise notice 'guards has neither user_id nor company_id; skipping guard_documents write policy';
    end if;
  end if;
end $$;

-- Vehicles: company admins manage own vehicles
do $$
declare key_col text; has_company boolean; vehicles_has_company boolean;
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='user_id') then
    key_col := 'user_id';
  elsif exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='id') then
    key_col := 'id';
  else
    raise notice 'profiles has no user identifier column';
    return;
  end if;

  select exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='company_id') into has_company;
  select exists (select 1 from information_schema.columns where table_schema='public' and table_name='vehicles' and column_name='company_id') into vehicles_has_company;
  if not has_company or not vehicles_has_company then
    raise notice 'profiles.company_id or vehicles.company_id not found; skipping vehicles policy';
    return;
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='vehicles' and policyname='vehicles manage'
  ) then
    execute format('create policy %I on public.vehicles for all using (company_id = (select company_id from public.profiles where %I = auth.uid())) with check (company_id = (select company_id from public.profiles where %I = auth.uid()));',
      'vehicles manage', key_col, key_col);
  end if;
end $$;

-- Helpful indexes (guarded for legacy schemas)
create index if not exists idx_companies_created_at on public.companies(created_at desc);
do $$ begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='guards' and column_name='company_id') then
  create index if not exists idx_guards_company on public.guards(company_id);
  end if;
end $$;
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='guard_documents') then
    create index if not exists idx_guard_docs_guard on public.guard_documents(guard_id);
  end if;
end $$;
do $$ begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='vehicles' and column_name='company_id') then
    create index if not exists idx_vehicles_company on public.vehicles(company_id);
  end if;
end $$;
