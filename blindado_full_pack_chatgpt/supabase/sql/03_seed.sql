-- 03_seed.sql
-- Seed a demo client profile and guard, plus pricing rules for CDMX
with u1 as (
  insert into auth.users (id, email) values (gen_random_uuid(), 'client@example.com') returning id
),
p1 as (
  insert into public.profiles (id, role, first_name, last_name, email)
  select id, 'client', 'Demo', 'Client', 'client@example.com' from u1 returning id
)
select * from p1;

with u2 as (
  insert into auth.users (id, email) values (gen_random_uuid(), 'guard@example.com') returning id
),
p2 as (
  insert into public.profiles (id, role, first_name, last_name, email)
  select id, 'guard', 'Demo', 'Guard', 'guard@example.com' from u2 returning id
)
insert into public.guards (id, city, skills, availability_status, home_lat, home_lng)
select id, 'CDMX', '{{"armed":true}}'::jsonb, 'online', 19.4326, -99.1332 from p2;

-- Pricing rule for CDMX / direct
insert into public.pricing_rules (city, tier, base_rate_guard, armed_multiplier, vehicle_rate_suv, vehicle_rate_armored, min_hours)
values ('CDMX','direct',700,1.5,1500,3000,4)
on conflict do nothing;
