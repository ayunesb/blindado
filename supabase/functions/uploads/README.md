Uploads Edge Function
=====================

Handles base64 uploads for avatars (public) and private buckets (licenses, vehicles, incidents) returning either a public URL or 1h signed URL.

POST JSON body:
{
  "bucket": "avatars|licenses|vehicles|incidents",
  "path": "folder/filename.ext",
  "base64": "<base64 data without data: prefix>",
  "contentType": "image/png"   // optional
}

Response: { ok: true, url, bucket, path } or { error }

Environment variables (set in project):
  BLINDADO_SUPABASE_URL
  BLINDADO_SUPABASE_SERVICE_ROLE_KEY

Imports use the same alias pattern as other functions (serve, supabase) via local import_map.json.
