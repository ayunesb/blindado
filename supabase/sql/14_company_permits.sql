-- Company permits metadata table (idempotent)
create table if not exists public.company_permits (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  insurance_doc_url text,
  collective_gun_permit_url text,
  created_at timestamptz default now()
);

-- Ensure one row per company (upsert target)
do $$ begin
  if not exists (
    select 1 from pg_indexes where schemaname='public' and indexname='uq_company_permits_company'
  ) then
    create unique index uq_company_permits_company on public.company_permits(company_id);
  end if;
end $$;

alter table public.company_permits enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='company_permits' and policyname='company permits manage'
  ) then
    create policy "company permits manage" on public.company_permits
      for all
      using (company_id = (select company_id from public.profiles where user_id = auth.uid() or id = auth.uid()))
      with check (company_id = (select company_id from public.profiles where user_id = auth.uid() or id = auth.uid()));
  end if;
end $$;
