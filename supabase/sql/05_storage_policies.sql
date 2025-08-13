-- 05_storage_policies.sql
-- Creates buckets & policies for profile photos, licenses, incidents media

-- Buckets
insert into storage.buckets (id, name, public) values
  ('profiles','profiles', true),
  ('licenses','licenses', false),
  ('incidents','incidents', false)
  on conflict (id) do nothing;

-- Helper: admin check
create or replace function public.is_admin(uid uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from public.profiles p where p.id = uid and p.role = 'admin'
  );
$$;

-- Profiles (public read, owner or admin write)
create policy "profiles_public_read" on storage.objects
  for select using (bucket_id = 'profiles');
create policy "profiles_owner_upsert" on storage.objects
  for all using (
    bucket_id = 'profiles' and (auth.uid() = owner or public.is_admin(auth.uid()))
  ) with check (
    bucket_id = 'profiles' and (auth.uid() = owner or public.is_admin(auth.uid()))
  );

-- Licenses (owner or admin full access)
create policy "licenses_owner_all" on storage.objects
  for all using (
    bucket_id = 'licenses' and (auth.uid() = owner or public.is_admin(auth.uid()))
  ) with check (
    bucket_id = 'licenses' and (auth.uid() = owner or public.is_admin(auth.uid()))
  );

-- Incidents (owner or admin full access)
create policy "incidents_owner_all" on storage.objects
  for all using (
    bucket_id = 'incidents' and (auth.uid() = owner or public.is_admin(auth.uid()))
  ) with check (
    bucket_id = 'incidents' and (auth.uid() = owner or public.is_admin(auth.uid()))
  );
