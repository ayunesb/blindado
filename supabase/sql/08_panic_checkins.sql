-- Minimal panic events and checkins to support UI flows
create table if not exists public.panic_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid null references public.bookings(id) on delete set null,
  user_id uuid references public.profiles(id) on delete cascade,
  guard_id uuid null references public.guards(id) on delete set null,
  notes text,
  created_at timestamptz default now()
);

create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete cascade,
  who text check (who in ('client','guard')) not null,
  status text,
  created_at timestamptz default now()
);

alter table public.panic_events enable row level security;
alter table public.checkins    enable row level security;

-- Panic: user can insert/select own rows; admins can read all (via v_is_admin)
create policy panic_insert_self on public.panic_events
  for insert with check (user_id = auth.uid());

create policy panic_select_self on public.panic_events
  for select using (user_id = auth.uid() or exists (select 1 from public.v_is_admin a where a.profile_id = auth.uid() and a.is_admin));

-- Checkins: open insert/select for now (non-sensitive status feed)
create policy checkins_insert_any on public.checkins for insert with check (true);
create policy checkins_select_any on public.checkins for select using (true);
