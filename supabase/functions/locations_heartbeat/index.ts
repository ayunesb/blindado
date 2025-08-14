// @ts-nocheck
import { serve } from "std/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import * as jose from "https://esm.sh/jose@4.15.5";

const URL = Deno.env.get("BLINDADO_SUPABASE_URL") || Deno.env.get("SUPABASE_URL");
const KEY = Deno.env.get("BLINDADO_SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const HB_SECRET = (Deno.env.get("HEARTBEAT_JWT_SECRET") || "").trim();
const DEV_ALLOW_NO_AUTH = (Deno.env.get("DEV_ALLOW_PLAINTEXT_HEARTBEAT") || "").toLowerCase() === "true";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "method not allowed" }), { status: 405, headers: CORS });

  const supa = createClient(URL!, KEY!, { auth: { persistSession: false } });

  try {
    const body = await req.json().catch(() => ({}));
    const { lat, lng, speed = 0, guard_id: bodyGuard } = body || {};
    if (typeof lat !== "number" || typeof lng !== "number") {
      return new Response(JSON.stringify({ error: "lat/lng required" }), { status: 400, headers: CORS });
    }

    let guard_id: string | null = null;

    const auth = req.headers.get("authorization") || "";
    if (auth.startsWith("Bearer ") && HB_SECRET) {
      const token = auth.substring("Bearer ".length);
      const { payload } = await jose.jwtVerify(token, new TextEncoder().encode(HB_SECRET));
      guard_id = (payload as any).gid as string;
    } else if (DEV_ALLOW_NO_AUTH && bodyGuard) {
      guard_id = bodyGuard;
    }

    if (!guard_id) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: CORS });

    const { error } = await supa
      .from("guards")
      .update({ home_lat: lat, home_lng: lng, availability_status: "online", updated_at: new Date().toISOString() })
      .eq("id", guard_id);
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, guard_id, speed }), { headers: CORS });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || String(e) }), { status: 500, headers: CORS });
  }
});
