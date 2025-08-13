-- supabase/sql/05_orgs.sql

-- 1) Organizations and Memberships
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  api_key text not null unique default encode(gen_random_bytes(24), 'hex'),
  created_by uuid null references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists public.org_members (
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_in_org text not null check (role_in_org in ('owner','manager','guard')),
  primary key (org_id, user_id),
  created_at timestamptz default now()
);

-- 2) Link guards and vehicles to org (company) or allow freelancers
alter table public.guards
  add column if not exists org_id uuid null references public.organizations(id) on delete set null;

alter table public.vehicles
  add column if not exists org_id uuid null references public.organizations(id) on delete set null;

-- Vehicle ownership constraint: company vehicles must have org_id; guard-owned must have guard_id
do $$
begin
  if not exists (
    select 1 from pg_constraint 
    where conname = 'vehicles_owner_ck'
  ) then
    alter table public.vehicles add constraint vehicles_owner_ck
    check (
      (owned_by = 'company' and org_id is not null and guard_id is null)
      or
      (owned_by = 'guard' and guard_id is not null)
    );
  end if;
end$$;

-- 3) RLS (minimal; functions use service key anyway)
alter table public.organizations enable row level security;
alter table public.org_members enable row level security;

-- Admins can read all orgs/members
create policy if not exists "orgs_admin_all"
on public.organizations for all using (
  exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

create policy if not exists "org_members_admin_all"
on public.org_members for all using (
  exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- 4) Demo seed: one org + link seeded guard to it, if present
insert into public.organizations (name, api_key)
values ('Partner A Seguridad', 'demo_org_key_1')
on conflict (api_key) do nothing;

-- If the known seeded guard exists, attach to demo org
update public.guards g
set org_id = (select id from public.organizations where api_key = 'demo_org_key_1' limit 1)
where g.id = 'c38efbac-fd1e-426b-a0ab-be59fd908c8c'
  and g.org_id is null;
