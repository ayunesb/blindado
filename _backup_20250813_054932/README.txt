Blindado full pack

1) In Supabase → SQL Editor, run in order:
   - supabase/sql/01_schema.sql
   - supabase/sql/02_policies.sql
   - supabase/sql/03_seed.sql

2) In Dashboard → Project Settings → Functions → Secrets:
   BLINDADO_SUPABASE_URL = https://isnezquuwepqcjkaupjh.supabase.co
   BLINDADO_SUPABASE_SERVICE_ROLE_KEY = <your service role key>

3) Deploy functions:
   supabase functions deploy pricing --no-verify-jwt
   supabase functions deploy bookings --no-verify-jwt
   supabase functions deploy bookings_confirm --no-verify-jwt
   supabase functions deploy matching --no-verify-jwt
   supabase functions deploy jobs --no-verify-jwt

4) Serve static pages:
   cd public
   python3 -m http.server 8080

Pages:
 - http://localhost:8080/client.html
 - http://localhost:8080/guard.html?guard_id=c38efbac-fd1e-426b-a0ab-be59fd908c8c
 - http://localhost:8080/dispatcher.html
