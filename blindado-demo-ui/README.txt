
BLINDADO DEMO UI
================

Files:
- pricing.html       -> Get a price quote
- dispatcher.html    -> Offer a booking to guards (run matching)
- guard.html         -> Guard accepts and updates status

Quick start
-----------
1) Move this whole folder somewhere easy (e.g., Desktop).
2) Start a tiny web server from Terminal:

   python3 -m http.server 8080

3) Open these in your browser:
   - http://localhost:8080/pricing.html
   - http://localhost:8080/dispatcher.html
   - http://localhost:8080/guard.html?guard_id=c38efbac-fd1e-426b-a0ab-be59fd908c8c

Creating a booking (in Supabase)
--------------------------------
1) Go to your project > SQL Editor > New query.
2) Paste and RUN this SQL. It creates a booking 30 min from now in CDMX:

insert into public.bookings (
  client_id, status, city, tier,
  armed_required, vehicle_required,
  start_ts, end_ts, origin_lat, origin_lng, notes
) values (
  '1b387371-6711-485c-81f7-79b2174b90fb',
  'matching', 'CDMX', 'direct',
  false, false,
  now() + interval '30 minutes', now() + interval '4 hours',
  19.4326, -99.1332, 'Demo booking via README'
)
returning id;

3) Copy the returned id.
4) Open dispatcher.html, paste the booking_id and click "Run matching".
5) Open guard.html (already pre-filled with guard_id): accept the job and step through statuses.

If you see errors
-----------------
- "Missing authorization header": redeploy the function with --no-verify-jwt
  supabase functions deploy pricing --no-verify-jwt
  supabase functions deploy matching --no-verify-jwt
  supabase functions deploy jobs --no-verify-jwt

- "booking not found": double-check you pasted the exact booking_id, and that you are in the same project.
- No jobs listed for the guard: ensure you created the guard profile and it's 'online' in CDMX.
