import { serve } from "serve";
import { createClient } from "supabase";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json"
};

function j(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return j({ error: "POST only" }, 405);

  const supabase = createClient(
    Deno.env.get("BLINDADO_SUPABASE_URL"),
    Deno.env.get("BLINDADO_SUPABASE_SERVICE_ROLE_KEY")
  );

  let payload;
  try { payload = await req.json(); } catch { return j({ error: "invalid JSON body" }, 400); }

  const { city, tier, armed_required = false, vehicle_required = false, start_ts, end_ts } = payload;
  if (!city || !tier || !start_ts || !end_ts) return j({ error: "missing required fields (city, tier, start_ts, end_ts)" }, 400);

  const start = new Date(start_ts), end = new Date(end_ts);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return j({ error: "invalid timestamps; use ISO 8601" }, 400);
  const rawHours = Math.ceil((end.getTime() - start.getTime()) / (1000*60*60));
  if (rawHours <= 0) return j({ error: "end_ts must be after start_ts" }, 400);

  const { data: rule } = await supabase
    .from("pricing_rules")
    .select("base_rate_guard, armed_multiplier, vehicle_rate_suv, vehicle_rate_armored, min_hours")
    .eq("city", city).eq("tier", tier).maybeSingle();

  const defaults = { base_rate_guard: 700, armed_multiplier: 1.5, vehicle_rate_suv: 1500, vehicle_rate_armored: 3000, min_hours: 4 };
  const r = rule || defaults;

  const billedHours = Math.max(r.min_hours ?? 1, rawHours);
  let hourly = Number(r.base_rate_guard) || defaults.base_rate_guard;
  if (armed_required) hourly = Math.round(hourly * Number(r.armed_multiplier || defaults.armed_multiplier));

  let total = hourly * billedHours;
  if (vehicle_required) total += Number(r.vehicle_rate_suv || defaults.vehicle_rate_suv) * billedHours;

  const surge_mult = 1;
  const quote_amount = Math.round(total * surge_mult);
  const preauth_amount = Math.round(quote_amount * 1.10);

  return j({ quote_amount, currency: "MXN", min_hours: r.min_hours || defaults.min_hours, surge_mult, preauth_amount });
});
