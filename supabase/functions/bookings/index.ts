import { serve } from "serve";
import { createClient } from "supabase";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...cors } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "not found" }, 404);

  const supabase = createClient(
    Deno.env.get("BLINDADO_SUPABASE_URL"),
    Deno.env.get("BLINDADO_SUPABASE_SERVICE_ROLE_KEY")
  );

  const body = await req.json().catch(() => ({}));
  const {
    client_id = "1b387371-6711-485c-81f7-79b2174b90fb",
    city = "CDMX",
    tier = "direct",
    armed_required = false,
    vehicle_required = false,
    start_ts,
    end_ts,
    origin_lat = 19.4326,
    origin_lng = -99.1332,
    notes = "Web-created booking"
  } = body || {};

  if (!start_ts || !end_ts) return json({ error: "start_ts and end_ts are required (ISO strings)" }, 400);

  const { data, error } = await supabase
    .from("bookings")
    .insert([{ client_id, status: "matching", city, tier, armed_required, vehicle_required, start_ts, end_ts, origin_lat, origin_lng, notes }])
    .select("id").single();

  if (error) return json({ error: error.message }, 500);
  return json({ ok: true, booking_id: data.id });
});
