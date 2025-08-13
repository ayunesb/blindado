import { serve } from "serve";
import { createClient } from "supabase";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json"
};

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders });
}
serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "not found" }, 404);

  const supabase = createClient(Deno.env.get("BLINDADO_SUPABASE_URL")!, Deno.env.get("BLINDADO_SUPABASE_SERVICE_ROLE_KEY")!);
  let body: any = {}
  try { body = await req.json(); } catch (_e) { return json({ error: "invalid JSON body" }, 400); }

  const {
    client_id,
    city,
    tier,
    armed_required = false,
    vehicle_required = false,
    vehicle_type = null,
    start_ts,
    end_ts,
    origin_lat,
    origin_lng,
    notes = null
  } = body;

  if (!client_id || !city || !tier || !start_ts || !end_ts) return json({ error: "missing fields" }, 400);

  const { data, error } = await supabase
    .from("bookings")
    .insert({
      client_id,
      status: "matching",
      city,
      tier,
      armed_required,
      vehicle_required,
      vehicle_type,
      start_ts,
      end_ts,
      origin_lat,
      origin_lng,
      notes
    }).select("id").single();

  if (error) return json({ error: error.message }, 500);
  return json({ ok: true, booking_id: data.id });
});
