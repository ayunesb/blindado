-- supabase/sql/07_org_invites.sql
-- Creates invites table for one-time tokens to join organizations (idempotent)

create table if not exists public.org_invites (
  token text primary key,
  org_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role text not null check (role in ('owner','admin','member')) default 'member',
  expires_at timestamptz not null,
  used boolean not null default false,
  used_by uuid null references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.org_invites enable row level security;
-- Note: no public RLS policies; functions use service role
