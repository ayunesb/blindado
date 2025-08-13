
-- Blindado: Initial schema migration
-- Run with: supabase db reset / supabase db push

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- PROFILES
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  role text check (role in ('client','guard','admin')) not null,
  first_name text,
  last_name text,
  phone_e164 text unique,
  email text,
  kyc_status text check (kyc_status in ('none','pending','verified','rejected')) default 'none',
  photo_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- GUARDS
create table if not exists public.guards (
  id uuid primary key references public.profiles(id) on delete cascade,
  city text,
  skills jsonb not null default '{}'::jsonb,
  rating numeric(2,1) default 5.0,
  active boolean default true,
  availability_status text check (availability_status in ('online','offline','busy')) default 'offline',
  home_lat numeric(9,6),
  home_lng numeric(9,6)
);

-- LICENSES
create table if not exists public.licenses (
  id uuid primary key default gen_random_uuid(),
  guard_id uuid not null references public.guards(id) on delete cascade,
  type text not null,
  issuer text,
  number text,
  valid_from date,
  valid_to date,
  files jsonb default '[]'::jsonb,
  status text check (status in ('valid','expired','revoked')) default 'valid'
);

-- VEHICLES
create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  owned_by text check (owned_by in ('company','guard')) not null,
  guard_id uuid null references public.guards(id) on delete set null,
  type text,
  armored boolean default false,
  plates text,
  docs jsonb default '[]'::jsonb,
  active boolean default true
);

-- BOOKINGS
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete restrict,
  status text check (status in ('draft','quoted','preauthorized','matching','assigned','enroute','onsite','in_progress','completed','canceled','failed')) not null default 'draft',
  city text,
  tier text check (tier in ('direct','elite','corporate')) not null default 'direct',
  armed_required boolean default false,
  vehicle_required boolean default false,
  vehicle_type text null,
  start_ts timestamptz,
  end_ts timestamptz,
  min_hours int default 4,
  origin_lat numeric(9,6),
  origin_lng numeric(9,6),
  dest_lat numeric(9,6),
  dest_lng numeric(9,6),
  notes text,
  surge_mult numeric(4,2) default 1.0,
  quote_amount numeric(12,2),
  currency text default 'MXN',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- BOOKING ITEMS
create table if not exists public.booking_items (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  item_type text check (item_type in ('guard','vehicle')) not null,
  qty int not null default 1,
  rate_hour numeric(10,2) not null,
  min_hours int not null
);

-- ASSIGNMENTS
create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  guard_id uuid not null references public.guards(id) on delete restrict,
  status text check (status in ('offered','accepted','declined','canceled','check_in','on_site','in_progress','check_out','completed')) not null default 'offered',
  check_in_ts timestamptz,
  on_site_ts timestamptz,
  in_progress_ts timestamptz,
  check_out_ts timestamptz,
  gps_trail jsonb default '[]'::jsonb
);

-- MESSAGES
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete restrict,
  text text,
  media_url text,
  created_at timestamptz default now()
);

-- INCIDENTS
create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  type text,
  severity int,
  narrative text,
  media jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

-- PRICING RULES
create table if not exists public.pricing_rules (
  id uuid primary key default gen_random_uuid(),
  city text not null,
  tier text not null,
  base_rate_guard numeric(10,2) not null,
  armed_multiplier numeric(4,2) not null default 1.0,
  vehicle_rate_suv numeric(10,2) not null,
  vehicle_rate_armored numeric(10,2) not null,
  min_hours int not null default 4
);

-- PAYMENTS
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  provider text check (provider in ('stripe','conekta')) not null,
  preauth_id text,
  charge_id text,
  amount_preauth numeric(12,2),
  amount_captured numeric(12,2),
  status text check (status in ('preauthorized','captured','refunded','failed')) not null,
  created_at timestamptz default now()
);

-- PAYOUTS
create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  guard_id uuid not null references public.guards(id) on delete restrict,
  period_start date,
  period_end date,
  amount numeric(12,2) not null,
  status text check (status in ('pending','paid')) not null default 'pending'
);

-- AUDIT LOGS
create table if not exists public.audit_logs (
  id bigserial primary key,
  actor_id uuid,
  action text,
  entity text,
  entity_id uuid,
  diff jsonb,
  ts timestamptz default now()
);

-- Indexes
create index if not exists idx_guards_city on public.guards(city);
create index if not exists idx_bookings_client on public.bookings(client_id);
create index if not exists idx_assignments_guard on public.assignments(guard_id);
create index if not exists idx_messages_booking on public.messages(booking_id);
create index if not exists idx_incidents_booking on public.incidents(booking_id);
create index if not exists idx_pricing_rules_city_tier on public.pricing_rules(city, tier);

-- RLS enablement
alter table public.profiles enable row level security;
alter table public.guards enable row level security;
alter table public.licenses enable row level security;
alter table public.vehicles enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_items enable row level security;
alter table public.assignments enable row level security;
alter table public.messages enable row level security;
alter table public.incidents enable row level security;
alter table public.pricing_rules enable row level security;
alter table public.payments enable row level security;
alter table public.payouts enable row level security;
alter table public.audit_logs enable row level security;

-- Simple helper for admin detection via role (read-only example policies)
-- In practice, guard with service key in Edge Functions for admin ops.

-- PROFILES policies
create policy profiles_self_select on public.profiles
for select using ( id = auth.uid() );

create policy profiles_self_update on public.profiles
for update using ( id = auth.uid() );

-- BOOKINGS policies
create policy bookings_client_rw on public.bookings
for all using (
  client_id = auth.uid()
) with check ( client_id = auth.uid() );

-- ASSIGNMENTS policies
create policy assignments_guard_select on public.assignments
for select using ( guard_id = auth.uid() );

-- Allow insert/update from service role only (edge functions) for assignments
revoke all on public.assignments from anon, authenticated;

-- MESSAGES policies: participants only
create policy messages_participants_select on public.messages
for select using (
 exists(select 1 from public.bookings b
   where b.id = messages.booking_id
   and (b.client_id = auth.uid() or exists(
     select 1 from public.assignments a where a.booking_id = b.id and a.guard_id = auth.uid()
   )))
);

create policy messages_participants_insert on public.messages
for insert with check (
 exists(select 1 from public.bookings b
   where b.id = messages.booking_id
   and (b.client_id = auth.uid() or exists(
     select 1 from public.assignments a where a.booking_id = b.id and a.guard_id = auth.uid()
   )))
);

-- Storage buckets (create via CLI; policies applied separately)
-- Suggested buckets: ids, licenses, incidents
