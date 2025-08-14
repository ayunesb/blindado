-- roles come from auth.users; profiles carry role
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role text check (role in ('client','freelancer','company_admin','admin')) default 'client',
  company_id uuid null,
  created_at timestamptz default now()
);

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

-- RLS
alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.guards enable row level security;
alter table public.guard_documents enable row level security;
alter table public.vehicles enable row level security;

-- Profiles: user can see/update own profile
create policy if not exists "profiles self" on public.profiles
  for select using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Companies: company_admin tied via profiles.company_id may read/write their own company
create policy if not exists "company admins manage own company" on public.companies
  for all using (id = (select company_id from public.profiles where user_id = auth.uid()))
  with check (id = (select company_id from public.profiles where user_id = auth.uid()));

-- Guards: company_admins may manage guards under their company; freelancers (user_id owner) may read self
create policy if not exists "guards readable by owner or company admin" on public.guards
  for select using (
    user_id = auth.uid()
    or company_id = (select company_id from public.profiles where user_id = auth.uid())
  );

create policy if not exists "guards write by company admin" on public.guards
  for insert with check (company_id = (select company_id from public.profiles where user_id = auth.uid()));
create policy if not exists "guards update by company admin" on public.guards
  for update using (company_id = (select company_id from public.profiles where user_id = auth.uid()));

-- Guard documents: owner (via guard->user) or company admin can manage
create policy if not exists "guard docs read" on public.guard_documents
  for select using (
    exists (select 1 from public.guards g where g.id = guard_id and (g.user_id = auth.uid() or g.company_id = (select company_id from public.profiles where user_id = auth.uid())))
  );
create policy if not exists "guard docs write" on public.guard_documents
  for all using (
    exists (select 1 from public.guards g where g.id = guard_id and g.company_id = (select company_id from public.profiles where user_id = auth.uid()))
  ) with check (
    exists (select 1 from public.guards g where g.id = guard_id and g.company_id = (select company_id from public.profiles where user_id = auth.uid()))
  );

-- Vehicles: company admins manage own vehicles
create policy if not exists "vehicles manage" on public.vehicles
  for all using (company_id = (select company_id from public.profiles where user_id = auth.uid()))
  with check (company_id = (select company_id from public.profiles where user_id = auth.uid()));

-- Helpful indexes
create index if not exists idx_companies_created_at on public.companies(created_at desc);
create index if not exists idx_guards_company on public.guards(company_id);
create index if not exists idx_guard_docs_guard on public.guard_documents(guard_id);
create index if not exists idx_vehicles_company on public.vehicles(company_id);
