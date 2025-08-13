// supabase/functions/admin_licenses/index.ts
// Simple admin endpoint to verify / reject licenses
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

  const payload = await req.json().catch(() => ({}));
  const { guard_id, type, issuer, number, valid_from, valid_to, files = [], status = "valid" } = payload;

  if (!guard_id || !type) {
    return new Response(JSON.stringify({ error: "guard_id and type required" }), { status: 400, headers: CORS });
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
    const { data, error } = await supa
      .from("licenses")
      .insert({
        guard_id,
        type,
        issuer: issuer ?? null,
        number: number ?? null,
        valid_from: valid_from ?? null,
        valid_to: valid_to ?? null,
        files, // array of { url, ... } is fine as jsonb
        status
      })
      .select()
      .single();
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, license: data }), { headers: CORS });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), { status: 500, headers: CORS });
  }
});
