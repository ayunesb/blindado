// supabase/functions/admin_licenses/index.ts
// Simple admin endpoint to verify / reject licenses
// Admin license upsert:
// (A) multipart: guard_id, type, (optional issuer/number/valid_from/valid_to), file -> uploads to "licenses" and inserts row.
// (B) JSON: { guard_id, type, issuer?, number?, valid_from?, valid_to?, files?: [{path|url:string}], status? } -> inserts row pointing to existing Storage path(s).

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function env(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`missing ${name}`);
  return v;
}

serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "method_not_allowed" }), {
        status: 405,
        headers: CORS,
      });
    }

    const adminHeader = req.headers.get("x-admin-secret") ?? "";
    const ADMIN = env("ADMIN_API_SECRET");
    if (adminHeader !== ADMIN) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: CORS,
      });
    }

    const supabase = createClient(
      env("BLINDADO_SUPABASE_URL"),
      env("BLINDADO_SUPABASE_SERVICE_ROLE_KEY"),
    );

    const ct = req.headers.get("content-type") || "";

    let guard_id = "";
    let type = "";
    let issuer: string | null = null;
    let number: string | null = null;
    let valid_from: string | null = null;
    let valid_to: string | null = null;
    let files: Array<{ path?: string; url?: string }> = [];
    let status = "valid";

    if (ct.includes("application/json")) {
      const body = await req.json();
      ({ guard_id, type } = body);
      issuer = body.issuer ?? null;
      number = body.number ?? null;
      valid_from = body.valid_from ?? null;
      valid_to = body.valid_to ?? null;
      files = Array.isArray(body.files) ? body.files : [];
      status = body.status ?? "valid";
    } else {
      const form = await req.formData();
      guard_id = String(form.get("guard_id") ?? "");
      type = String(form.get("type") ?? "");
      issuer = form.get("issuer") ? String(form.get("issuer")) : null;
      number = form.get("number") ? String(form.get("number")) : null;
      valid_from = form.get("valid_from") ? String(form.get("valid_from")) : null;
      valid_to = form.get("valid_to") ? String(form.get("valid_to")) : null;

      const file = form.get("file") as File | null;
      if (file) {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
        const path = `${guard_id}/${type}/${Date.now()}.${ext}`;
        const up = await supabase.storage.from("licenses").upload(path, bytes, {
          contentType: file.type || "application/octet-stream",
          upsert: true,
        });
        if (up.error) {
          return new Response(JSON.stringify({ error: up.error.message }), {
            status: 500,
            headers: CORS,
          });
        }
        files = [{ path }];
      }
    }

    if (!guard_id || !type) {
      return new Response(JSON.stringify({ error: "guard_id_and_type_required" }), {
        status: 400,
        headers: CORS,
      });
    }

    // Normalize files into {path} values
    const normFiles = files.map((f) => {
      const p = f.path ?? f.url ?? "";
      return { path: p, public_url: null };
    });

    const { data, error } = await supabase
      .from("licenses")
      .insert({
        guard_id,
        type,
        issuer,
        number,
        valid_from,
        valid_to,
        files: normFiles,
        status,
      })
      .select("id")
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: CORS,
      });
    }

    return new Response(JSON.stringify({ ok: true, license_id: data.id }), {
      status: 200,
      headers: CORS,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: CORS });
  }
});
