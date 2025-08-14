import { serve } from "std/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json"
};
const j = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

function cityFromLatLng(lat?: number | null, lng?: number | null): string | null {
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  if (lat >= 19.0 && lat <= 19.8 && lng >= -99.35 && lng <= -98.8) return "CDMX";
  if (lat >= 20.5 && lat <= 20.9 && lng >= -103.6 && lng <= -103.1) return "GDL";
  if (lat >= 25.4 && lat <= 26.0 && lng >= -100.5 && lng <= -99.9) return "MTY";
  return null;
}

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
    client_id, city: cityInput, tier = "direct",
    armed_required = false, vehicle_required = false, vehicle_type = null,
    start_ts, end_ts, origin_lat, origin_lng, dest_lat = null, dest_lng = null,
    notes = null
  } = body;

  const derivedCity = cityFromLatLng(origin_lat, origin_lng);
  const city = derivedCity ?? cityInput;

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
