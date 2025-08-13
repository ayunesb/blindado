-- 03_seed.sql (demo data)
insert into public.profiles (id, role, first_name, last_name, phone_e164, email, kyc_status)
values ('1b387371-6711-485c-81f7-79b2174b90fb','client','Client','Demo','+5215555555551','client@demo.com','verified')
on conflict (id) do nothing;

insert into public.profiles (id, role, first_name, last_name, phone_e164, email, kyc_status)
values ('c38efbac-fd1e-426b-a0ab-be59fd908c8c','guard','Juan','Guard','+5215555555552','guard@demo.com','verified')
on conflict (id) do nothing;

insert into public.guards (id, city, skills, availability_status)
values ('c38efbac-fd1e-426b-a0ab-be59fd908c8c','CDMX','{"armed": true, "driver": true}','online')
on conflict (id) do nothing;

insert into public.pricing_rules (city, tier, base_rate_guard, armed_multiplier, vehicle_rate_suv, vehicle_rate_armored, min_hours)
values ('CDMX','direct',700,1.5,1500,3000,4)
on conflict do nothing;
