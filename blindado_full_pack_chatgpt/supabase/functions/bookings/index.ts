import { serve } from "serve";
import { createClient } from "supabase";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};
function j(body: any, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return j({ error: "not found" }, 404);

  const supabase = createClient(
    Deno.env.get("BLINDADO_SUPABASE_URL")!,
    Deno.env.get("BLINDADO_SUPABASE_SERVICE_ROLE_KEY")!
  );

  const body = await req.json().catch(() => ({}));
  const {
    client_id,
    city = "CDMX",
    tier = "direct",
    armed_required = false,
    vehicle_required = false,
    vehicle_type = null,
    start_ts,
    end_ts,
    origin_lat = 19.4326,
    origin_lng = -99.1332,
    notes = "Web-created booking",
    quote_amount = null,
  } = body || {}

  if (!client_id) return j({ error: "client_id required" }, 400);
  if (!start_ts || !end_ts) return j({ error: "start_ts and end_ts are required (ISO strings)" }, 400);

  const { data, error } = await supabase.from("bookings").insert([
    {
      client_id, status: "quoted", city, tier, armed_required, vehicle_required, vehicle_type,
      start_ts, end_ts, origin_lat, origin_lng, notes, quote_amount
    }
  ]).select("id").single();

  if (error) return j({ error: error.message }, 500);
  return j({ ok: true, booking_id: data.id });
});
