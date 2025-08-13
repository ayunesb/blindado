-- Organizations (companies) + membership + documents (licenses, IDs)
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

-- Membership: users/profiles join organizations with roles
create table if not exists public.org_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text check (role in ('owner','admin','manager','guard','viewer')) not null default 'guard',
  created_at timestamptz default now(),
  unique (org_id, profile_id)
);

-- Link guards to an org (nullable to allow freelancers); if set, they belong to that org
alter table public.guards add column if not exists org_id uuid null references public.organizations(id) on delete set null;

-- Vehicles already exist; ensure owner linkage covers company or guard
alter table public.vehicles add column if not exists org_id uuid null references public.organizations(id) on delete set null;

-- Documents for compliance (e.g., license to carry)
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  owner_type text check (owner_type in ('profile','guard','vehicle')) not null,
  owner_id uuid not null,
  org_id uuid null references public.organizations(id) on delete set null,
  doc_type text check (doc_type in ('INE','KYC_SELFIE','SEDENA','PSP_STATE','DRIVER','VEHICLE_CARD','OTHER')) not null,
  file_path text not null,
  issued_on date null,
  valid_to date null,
  status text check (status in ('pending','valid','expired','rejected')) not null default 'pending',
  created_at timestamptz default now()
);

-- Super admin helper (from profiles.role = 'admin')
create or replace view public.v_is_admin as
  select id as profile_id, (role = 'admin') as is_admin from public.profiles;

-- RLS
alter table public.organizations enable row level security;
alter table public.org_members   enable row level security;
alter table public.documents     enable row level security;

-- Policies:
-- Orgs: admins (platform) can read all; org members can read their own org
create policy org_read_admin on public.organizations
for select using (exists (select 1 from public.v_is_admin a where a.profile_id = auth.uid() and a.is_admin));

create policy org_read_member on public.organizations
for select using (exists (select 1 from public.org_members m where m.org_id = organizations.id and m.profile_id = auth.uid()));

create policy org_insert_admin on public.organizations
for insert with check (exists (select 1 from public.v_is_admin a where a.profile_id = auth.uid() and a.is_admin));

-- Membership: members can see their row; admins all
create policy org_members_read on public.org_members
for select using (
  profile_id = auth.uid()
  or exists (select 1 from public.v_is_admin a where a.profile_id = auth.uid() and a.is_admin)
);

create policy org_members_insert_admin on public.org_members
for insert with check (exists (select 1 from public.v_is_admin a where a.profile_id = auth.uid() and a.is_admin));

-- Documents: owner (profile) or org admin can read; platform admin all
create policy docs_read on public.documents
for select using (
  (owner_type='profile' and owner_id = auth.uid())
  or exists (select 1 from public.org_members m where m.org_id = documents.org_id and m.profile_id = auth.uid() and m.role in ('owner','admin','manager'))
  or exists (select 1 from public.v_is_admin a where a.profile_id = auth.uid() and a.is_admin)
);

create policy docs_insert_owner on public.documents
for insert with check (
  (owner_type='profile' and owner_id = auth.uid())
  or exists (select 1 from public.org_members m where m.org_id = documents.org_id and m.profile_id = auth.uid() and m.role in ('owner','admin','manager'))
  or exists (select 1 from public.v_is_admin a where a.profile_id = auth.uid() and a.is_admin)
);

-- Seed minimal: one org + link the seeded guard to it (if present)
insert into public.organizations (id, name)
values ('11111111-1111-1111-1111-111111111111', 'Blindado Company')
on conflict (id) do nothing;

insert into public.org_members (org_id, profile_id, role)
select '11111111-1111-1111-1111-111111111111', g.id, 'guard'
from public.guards g
where g.id = 'c38efbac-fd1e-426b-a0ab-be59fd908c8c'
on conflict do nothing;

update public.guards
set org_id = '11111111-1111-1111-1111-111111111111'
where id = 'c38efbac-fd1e-426b-a0ab-be59fd908c8c';
