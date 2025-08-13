-- 02_policies.sql (RLS examples)
alter table public.profiles enable row level security;
alter table public.bookings enable row level security;
alter table public.assignments enable row level security;
alter table public.messages enable row level security;

create policy profiles_self_select on public.profiles for select using ( id = auth.uid() );
create policy profiles_self_update on public.profiles for update using ( id = auth.uid() ) with check ( id = auth.uid() );
create policy profiles_admin_all on public.profiles for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

create policy bookings_client_read on public.bookings for select using (
  client_id = auth.uid() or exists(select 1 from assignments a where a.booking_id = bookings.id and a.guard_id = auth.uid())
);
create policy bookings_client_insert on public.bookings for insert with check ( client_id = auth.uid() );

create policy messages_participants_select on public.messages for select using (
  exists(select 1 from public.bookings b where b.id = messages.booking_id and (
    b.client_id = auth.uid() or exists(select 1 from public.assignments a where a.booking_id = b.id and a.guard_id = auth.uid())
  ))
);
create policy messages_participants_insert on public.messages for insert with check (
  exists(select 1 from public.bookings b where b.id = messages.booking_id and (
    b.client_id = auth.uid() or exists(select 1 from public.assignments a where a.booking_id = b.id and a.guard_id = auth.uid())
  ))
);
