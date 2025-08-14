-- Bookings: new optional fields for the investor demo & prod
alter table public.bookings
  add column if not exists pickup_address text,
  add column if not exists dress_code text,
  add column if not exists protectees integer not null default 1 check (protectees >= 1),
  add column if not exists protectors integer not null default 1 check (protectors >= 1),
  add column if not exists vehicles integer  not null default 0 check (vehicles >= 0);

-- Helpful index for upcoming lists and ETAs
create index if not exists bookings_start_ts_idx on public.bookings (start_ts);

-- (Optional) comment docs
comment on column public.bookings.pickup_address is 'Freeform address provided by client';
comment on column public.bookings.dress_code is 'Business Formal | Business Casual | Tactical Casual';
