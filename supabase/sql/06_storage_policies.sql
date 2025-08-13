-- supabase/sql/06_storage_policies.sql

-- Create buckets (no-op if they already exist)
select storage.create_bucket('avatars', public => true);
select storage.create_bucket('licenses', public => false);

-- Allow admins (via RLS JWT) to read avatars/licenses (simplistic)
create policy if not exists "avatars_admin_read"
on storage.objects for select
using (
  bucket_id = 'avatars' and exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

create policy if not exists "licenses_admin_read"
on storage.objects for select
using (
  bucket_id = 'licenses' and exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);
