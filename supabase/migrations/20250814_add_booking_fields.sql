-- 1) Ensure extension
create extension if not exists "pgcrypto";

-- 2) Add columns to bookings (safe if they already exist)
alter table public.bookings
  add column if not exists pickup_address text,
  add column if not exists dress_code text,
  add column if not exists protectees integer default 1,
  add column if not exists protectors integer default 1,
  add column if not exists vehicles integer default 0;

-- 3) Helpful indexes (idempotent)
create index if not exists idx_bookings_start_ts on public.bookings (start_ts);
create index if not exists idx_bookings_city on public.bookings (city);

-- 4) Optional comments (nice for admin UI)
comment on column public.bookings.pickup_address is 'Human-readable pickup address entered by client';
comment on column public.bookings.dress_code is 'Business Formal, Business Casual, or Tactical Casual';
comment on column public.bookings.protectees is 'How many principals we are protecting';
comment on column public.bookings.protectors is 'How many protectors requested';
comment on column public.bookings.vehicles is 'How many vehicles requested (0 = none)';
