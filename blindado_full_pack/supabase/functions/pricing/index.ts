import { serve } from "serve";
import { createClient } from "supabase";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json"
};

function j(body: any, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}
serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return j({ error: "POST only" }, 405);

  const supabase = createClient(Deno.env.get("BLINDADO_SUPABASE_URL")!, Deno.env.get("BLINDADO_SUPABASE_SERVICE_ROLE_KEY")!);

  let payload: any;
  try { payload = await req.json(); } catch { return j({ error: "invalid JSON body" }, 400); }

  const { city, tier, armed_required = false, vehicle_required = false, vehicle_type = null, start_ts, end_ts } = payload;
  if (!city || !tier || !start_ts || !end_ts) return j({ error: "missing required fields (city, tier, start_ts, end_ts)" }, 400);

  const start = new Date(start_ts);
  const end = new Date(end_ts);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return j({ error: "invalid timestamps; use ISO 8601" }, 400);

  const rawHours = Math.max(0.5, (end.getTime() - start.getTime()) / (1000 * 60 * 60));
  const { data: rule, error } = await supabase
    .from("pricing_rules")
    .select("base_rate_guard, armed_multiplier, vehicle_rate_suv, vehicle_rate_armored, min_hours")
    .eq("city", city).eq("tier", tier).single();

  if (error || !rule) return j({ error: "pricing rule not found for city/tier" }, 404);

  const billedHours = Math.max(rule.min_hours ?? 1, rawHours);
  let guardHourly = rule.base_rate_guard;
  if (armed_required) guardHourly = Math.round(guardHourly * (rule.armed_multiplier ?? 1));

  let total = guardHourly * billedHours;

  if (vehicle_required) {
    // simple v1: hourly vehicle rate by type (default suv if unspecified)
    const vt = vehicle_type === "armored_suv" ? "vehicle_rate_armored" : "vehicle_rate_suv";
    const vr = vt === "vehicle_rate_armored" ? (rule.vehicle_rate_armored ?? 0) : (rule.vehicle_rate_suv ?? 0);
    total += vr * billedHours;
  }

  const surge_mult = 1;
  const quote_amount = Math.round(total * surge_mult);
  const preauth_amount = Math.round(quote_amount * 1.10);

  return j({
    quote_amount,
    currency: "MXN",
    min_hours: rule.min_hours ?? 1,
    surge_mult,
    preauth_amount
  });
});
