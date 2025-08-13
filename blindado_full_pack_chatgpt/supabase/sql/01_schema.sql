-- 01_schema.sql
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- Profiles
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

-- Guards
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

-- Vehicles (minimal for MVP)
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

-- Bookings
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

-- Assignments
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

-- Pricing Rules
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

-- Payments (minimal)
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
