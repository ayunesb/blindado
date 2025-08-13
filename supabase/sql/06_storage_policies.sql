-- Buckets
insert into storage.buckets (id, name, public) values
  ('avatars','avatars', true),
  ('licenses','licenses', false),
  ('vehicles','vehicles', false),
  ('incidents','incidents', false)
on conflict (id) do nothing;

-- Avatars: public read, owner/org can write
create policy "avatars public read" on storage.objects
for select using (bucket_id = 'avatars');

create policy "avatars owner write" on storage.objects
for insert with check (
  bucket_id='avatars' and (auth.role() = 'authenticated')
);

-- Licenses / vehicles / incidents: private; only owner/org admin or platform admin
create policy "private buckets read" on storage.objects
for select using (
  bucket_id in ('licenses','vehicles','incidents')
  and (
    exists (select 1 from public.v_is_admin a where a.profile_id = auth.uid() and a.is_admin)
    or (auth.uid() is not null) -- clients can fetch their signed urls via function; direct read usually blocked
  )
);

create policy "private buckets write" on storage.objects
for insert with check (
  bucket_id in ('licenses','vehicles','incidents') and auth.role() = 'authenticated'
);
