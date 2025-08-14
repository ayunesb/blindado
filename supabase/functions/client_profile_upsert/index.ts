import { serve } from "std/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "method" }), { status: 405, headers: cors });

  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supa = createClient(url, key);

  const auth = (req.headers.get("authorization") || "").replace("Bearer ", "");
  const { data: { user }, error: uerr } = await supa.auth.getUser(auth);
  if (uerr || !user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: cors });

  const body = await req.json().catch(() => ({}));
  const { full_name, phone } = body ?? {};
  const up = await supa.from("profiles").upsert({ user_id: user.id, full_name, phone, role: "client" }, { onConflict: "user_id" }).select("user_id").single();
  if ((up as any).error) return new Response(JSON.stringify({ error: (up as any).error.message }), { status: 400, headers: cors });
  return new Response(JSON.stringify({ ok: true }), { headers: cors });
});
