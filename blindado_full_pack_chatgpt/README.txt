Blindado full pack (ChatGPT build)

Quick start
-----------
1) Unzip this folder into your project root so you have:
   - public/
   - supabase/functions/
   - supabase/sql/
   - README.txt

2) In Supabase Dashboard → SQL Editor, run these IN ORDER:
   - supabase/sql/01_schema.sql
   - supabase/sql/02_policies.sql
   - supabase/sql/03_seed.sql

3) Set Edge Function secrets (Dashboard → Functions → Secrets):
   - BLINDADO_SUPABASE_URL = https://<YOUR-PROJECT-REF>.supabase.co
   - BLINDADO_SUPABASE_SERVICE_ROLE_KEY = <your service role key>

4) Deploy functions (each line separately):
   supabase functions deploy pricing --no-verify-jwt
   supabase functions deploy bookings --no-verify-jwt
   supabase functions deploy payments_preauth --no-verify-jwt
   supabase functions deploy bookings_confirm --no-verify-jwt
   supabase functions deploy matching --no-verify-jwt
   supabase functions deploy jobs --no-verify-jwt

5) Serve the static pages locally:
   cd public
   python3 -m http.server 8080

   Open http://localhost:8080/client.html

Notes
-----
- Update the const FN in each HTML file if your Functions hostname differs.
- payments_preauth is a stub for demo; replace with Stripe/Conekta later.
