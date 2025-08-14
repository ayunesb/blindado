-- Store client quotes for idempotent checkout redirects
create table if not exists public.quotes (
  booking_id text primary key,
  payload jsonb not null,
  created_at timestamptz not null default now()
);
