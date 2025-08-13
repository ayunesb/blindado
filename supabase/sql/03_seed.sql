-- 03_seed.sql (demo data)
insert into public.profiles (id, role, first_name, last_name, phone_e164, email, kyc_status, photo_url)
values ('1b387371-6711-485c-81f7-79b2174b90fb','client','Client','Demo','+5215555555551','client@demo.com','verified','https://i.pravatar.cc/150?img=5')
on conflict (id) do nothing;

insert into public.profiles (id, role, first_name, last_name, phone_e164, email, kyc_status, photo_url)
values ('c38efbac-fd1e-426b-a0ab-be59fd908c8c','guard','Juan','Guard','+5215555555552','guard@demo.com','verified','https://i.pravatar.cc/150?img=12')
on conflict (id) do nothing;

insert into public.guards (id, city, skills, availability_status)
values ('c38efbac-fd1e-426b-a0ab-be59fd908c8c','CDMX','{"armed": true, "driver": true}','online')
on conflict (id) do nothing;

insert into public.pricing_rules (city, tier, base_rate_guard, armed_multiplier, vehicle_rate_suv, vehicle_rate_armored, min_hours)
values ('CDMX','direct',700,1.5,1500,3000,4)
on conflict do nothing;

-- Additional pricing rules to exercise matrix in CI (different tiers & cities)
insert into public.pricing_rules (city, tier, base_rate_guard, armed_multiplier, vehicle_rate_suv, vehicle_rate_armored, min_hours)
values ('CDMX','elite',900,1.6,1800,3600,4)
on conflict do nothing;

insert into public.pricing_rules (city, tier, base_rate_guard, armed_multiplier, vehicle_rate_suv, vehicle_rate_armored, min_hours)
values ('GDL','direct',600,1.4,1300,2600,4)
on conflict do nothing;

insert into public.pricing_rules (city, tier, base_rate_guard, armed_multiplier, vehicle_rate_suv, vehicle_rate_armored, min_hours)
values ('MTY','corporate',1100,1.7,2200,4400,4)
on conflict do nothing;
