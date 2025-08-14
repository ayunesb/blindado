import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json"
};
const j = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return j({ error: "POST only" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || Deno.env.get("BLINDADO_SUPABASE_URL");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("BLINDADO_SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return j({ error: "server misconfigured" }, 500);
  }
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  const body = await req.json().catch(() => ({}));
  const {
    client_id, city, tier = "direct",
    armed_required = false, vehicle_required = false, vehicle_type = null,
    start_ts, end_ts, origin_lat, origin_lng, dest_lat = null, dest_lng = null,
    notes = null
  } = body;

  if (!client_id || !start_ts || !end_ts || !city) {
    return j({ error: "client_id, city, start_ts, end_ts are required" }, 400);
  }

  const { data, error } = await supabase
    .from("bookings")
    .insert([{
      client_id, city, tier,
      armed_required, vehicle_required, vehicle_type,
      start_ts, end_ts,
      origin_lat, origin_lng, dest_lat, dest_lng,
      notes,
      status: "quoted"
    }])
    .select("id")
    .single();

  if (error) return j({ error: error.message }, 500);
  return j({ ok: true, booking_id: data.id });
});
