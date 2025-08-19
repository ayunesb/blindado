-- Edge function support: simple rate limit and logs table (idempotent)
create table if not exists public.edge_rate_limits (
  key text primary key,
  count int not null default 0,
  reset_at timestamptz not null default now() + interval '1 minute'
);

create table if not exists public.logs_edge (
  id bigserial primary key,
  fn text not null,
  actor uuid,
  action text,
  payload jsonb,
  ts timestamptz default now()
);

create index if not exists idx_logs_edge_fn_ts on public.logs_edge(fn, ts desc);
