// supabase/functions/admin_documents/index.ts
// Admin-only signed upload URL endpoint
import { serve } from "std/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-secret",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json"
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "method" }), { status: 405, headers: CORS });

  const adminSecret = Deno.env.get("ADMIN_API_SECRET");
  if (!adminSecret) return new Response(JSON.stringify({ error: "missing ADMIN_API_SECRET" }), { status: 500, headers: CORS });

  const provided = req.headers.get("x-admin-secret") || "";
  if (provided !== adminSecret) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: CORS });

  const { bucket, path } = await req.json().catch(() => ({}));
  if (!bucket || !path) {
    return new Response(JSON.stringify({ error: "bucket and path required" }), { status: 400, headers: CORS });
  }

  // Prefer BLINDADO_* but fallback to standard SUPABASE_* to avoid duplication
  const url =
    Deno.env.get("BLINDADO_SUPABASE_URL") ||
    Deno.env.get("SUPABASE_URL");
  const key =
    Deno.env.get("BLINDADO_SUPABASE_SERVICE_ROLE_KEY") ||
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !key) {
    return new Response(
      JSON.stringify({ error: "missing Supabase URL or service role key" }),
      { status: 500, headers: CORS }
    );
  }
  const supa = createClient(url, key);

  try {
    const { data, error } = await supa.storage.from(bucket).createSignedUploadUrl(path);
    if (error) throw error;
    // Client will PUT file bytes to `data.signedUrl` with header `x-upsert: true` plus `token`.
    return new Response(JSON.stringify({ ok: true, bucket, path, ...data }), { headers: CORS });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), { status: 500, headers: CORS });
  }
});
