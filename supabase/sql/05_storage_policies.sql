-- 05_storage_policies.sql
-- Creates buckets & policies for profile photos, company docs, vehicles docs, incidents

-- Buckets
insert into storage.buckets (id, name, public) values
  ('profiles','profiles', false),
  ('company_docs','company_docs', false),
  ('vehicles','vehicles', false),
  ('incidents','incidents', false)
  on conflict (id) do nothing;

-- Helper: admin check
create or replace function public.is_admin(uid uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from public.profiles p where p.id = uid and p.role = 'admin'
  );
$$;

-- Profiles: private; owner or admin can read/write (signed URLs recommended)
do $$ begin
  if exists (select 1 from pg_policies where polname='profiles_public_read') then
    drop policy "profiles_public_read" on storage.objects;
  end if;
end $$;

create policy if not exists "profiles owner read" on storage.objects
  for select using (
    bucket_id = 'profiles' and (auth.uid() = owner or public.is_admin(auth.uid()))
  );
create policy if not exists "profiles owner write" on storage.objects
  for all using (
    bucket_id = 'profiles' and (auth.uid() = owner or public.is_admin(auth.uid()))
  ) with check (
    bucket_id = 'profiles' and (auth.uid() = owner or public.is_admin(auth.uid()))
  );

-- Company docs and vehicles (private)
create policy if not exists "company docs owner all" on storage.objects
  for all using (
    bucket_id = 'company_docs' and (auth.uid() = owner or public.is_admin(auth.uid()))
  ) with check (
    bucket_id = 'company_docs' and (auth.uid() = owner or public.is_admin(auth.uid()))
  );

create policy if not exists "vehicles owner all" on storage.objects
  for all using (
    bucket_id = 'vehicles' and (auth.uid() = owner or public.is_admin(auth.uid()))
  ) with check (
    bucket_id = 'vehicles' and (auth.uid() = owner or public.is_admin(auth.uid()))
  );

-- Incidents (owner or admin full access)
create policy if not exists "incidents_owner_all" on storage.objects
  for all using (
    bucket_id = 'incidents' and (auth.uid() = owner or public.is_admin(auth.uid()))
  ) with check (
    bucket_id = 'incidents' and (auth.uid() = owner or public.is_admin(auth.uid()))
  );
