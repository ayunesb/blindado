Blindado full pack (polished bilingual MVP)

1) Run SQL migrations in order (Supabase → SQL Editor):
   01_schema.sql
   02_policies.sql
   03_seed.sql
   04_update_avatars.sql        (optional: avatars sample)
   05_orgs.sql                  (organizations, memberships, documents)
   06_storage_policies.sql      (buckets + storage RLS)

2) Set Function Secrets (Dashboard → Project Settings → Functions → Secrets):
   BLINDADO_SUPABASE_URL = https://isnezquuwepqcjkaupjh.supabase.co
   BLINDADO_SUPABASE_SERVICE_ROLE_KEY = <service role key>
   KYC_WEBHOOK_SECRET = <random-long-secret>
   ADMIN_API_SECRET = <random-long-secret>

3) Deploy Edge Functions (from repo root):
   supabase functions deploy pricing --no-verify-jwt
   supabase functions deploy bookings --no-verify-jwt
   supabase functions deploy bookings_confirm --no-verify-jwt
   supabase functions deploy matching --no-verify-jwt
   supabase functions deploy jobs --no-verify-jwt
   supabase functions deploy payments_preauth --no-verify-jwt
   supabase functions deploy admin_licenses --no-verify-jwt
   supabase functions deploy org_portal --no-verify-jwt
   supabase functions deploy uploads --no-verify-jwt
   supabase functions deploy admin_documents --no-verify-jwt
   supabase functions deploy kyc_webhook --no-verify-jwt

4) Static demo pages:
   cd public
   python3 -m http.server 8080

Pages:
 - http://localhost:8080/client.html            (booking flow: Quote → Preauth → Confirm → Matching)
 - http://localhost:8080/guard.html?guard_id=c38efbac-fd1e-426b-a0ab-be59fd908c8c  (offers + status)
 - http://localhost:8080/dispatcher.html        (manual matching)
 - http://localhost:8080/org-admin.html         (invite guards + insert compliance documents)
All pages have EN/ES toggle and dark Tailwind UI. Replace YOUR_GOOGLE_MAPS_KEY placeholders.

Uploads function (base64): POST /functions/v1/uploads
Body JSON:
  { "bucket":"avatars","path":"avatars/demo.png","base64":"<rawBase64>","contentType":"image/png" }
Returns: { ok:true, url, bucket, path }
Public bucket (avatars) returns publicUrl; private buckets return signedUrl (1h).

Storage buckets: avatars (public), licenses, vehicles, incidents (private) with RLS policies.
Compliance: documents table for guard/profile/vehicle docs (INE, DRIVER, etc.).
Admin Documents: /functions/v1/admin_documents { action:"invite_guard" | "insert_document" }
KYC Webhook: /functions/v1/kyc_webhook (POST) headers: x-kyc-secret: <KYC_WEBHOOK_SECRET>, body: { profile_id, status: pending|verified|rejected }

Notes:
 - Functions use service role key via secrets (no end‑user JWT verification yet; treat as internal admin API).
 - Pricing/booking timestamps are ISO strings (client and guard UIs handle basic flows only).
 - Org & membership model supports multi-company + freelancers (guards without org_id).
 - Admin license review via admin_licenses function (list / set_status).
 - Consistent import aliases (serve, supabase) via per-function import_map.json.
 - Set KYC_WEBHOOK_SECRET in Function Secrets for webhook auth.
 - Set ADMIN_API_SECRET for admin_documents & admin_licenses (header: x-admin-secret).

Next ideas:
 - Add user-authenticated flows and restrict function access.
 - Add tests for documents + uploads.
 - Add rate limiting & validation for uploads size/type.
