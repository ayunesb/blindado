Blindado Pack — Quick Steps

1) Unzip into your repo root:
   unzip blindado_full_pack.zip -d .

2) In Supabase Dashboard, run the SQL files IN ORDER:
   - supabase/sql/01_schema.sql
   - supabase/sql/02_policies.sql
   - supabase/sql/03_seed.sql

3) In Supabase Dashboard → Functions → Secrets, set:
   - BLINDADO_SUPABASE_URL = https://isnezquuwepqcjkaupjh.supabase.co
   - BLINDADO_SUPABASE_SERVICE_ROLE_KEY = <your service role key>

4) Deploy functions (run each line):
   supabase functions deploy pricing --no-verify-jwt
   supabase functions deploy bookings --no-verify-jwt
   supabase functions deploy bookings_confirm --no-verify-jwt
   supabase functions deploy matching --no-verify-jwt
   supabase functions deploy jobs --no-verify-jwt

5) Serve static pages:
   cd public
   python3 -m http.server 8080

6) Open in your browser:
   - http://localhost:8080/client.html
   - http://localhost:8080/guard.html?guard_id=c38efbac-fd1e-426b-a0ab-be59fd908c8c
   - http://localhost:8080/dispatcher.html
