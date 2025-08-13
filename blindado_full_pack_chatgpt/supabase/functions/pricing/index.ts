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
  if (req.method !== "POST") return j({ error: "POST only" }, 405);

  const supabase = createClient(
    Deno.env.get("BLINDADO_SUPABASE_URL")!,
    Deno.env.get("BLINDADO_SUPABASE_SERVICE_ROLE_KEY")!
  );

  let payload: any;
  try { payload = await req.json(); } catch { return j({ error: "invalid JSON body" }, 400); }

  const { city, tier, armed_required = false, vehicle_required = false, vehicle_type = null, start_ts, end_ts } = payload;
  if (!city || !tier || !start_ts || !end_ts) return j({ error: "missing required fields (city, tier, start_ts, end_ts)" }, 400);

  const start = new Date(start_ts); const end = new Date(end_ts);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return j({ error: "invalid timestamps; use ISO 8601" }, 400);
  const rawHours = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60));
  if (rawHours <= 0) return j({ error: "end_ts must be after start_ts" }, 400);

  const { data: rule, error } = await supabase
    .from("pricing_rules")
    .select("base_rate_guard, armed_multiplier, vehicle_rate_suv, vehicle_rate_armored, min_hours")
    .eq("city", city).eq("tier", tier).single();

  if (error || !rule) return j({ error: "pricing rule not found for city/tier" }, 404);

  const min_hours = rule.min_hours ?? 1;
  const hours = Math.max(min_hours, rawHours);

  let guardRate = Number(rule.base_rate_guard);
  if (armed_required) guardRate = Math.round(guardRate * Number(rule.armed_multiplier ?? 1));

  let total = guardRate * hours;

  if (vehicle_required) {
    const suvRate = Number(rule.vehicle_rate_suv ?? 0);
    const armoredRate = Number(rule.vehicle_rate_armored ?? suvRate * 2);
    const rate = vehicle_type === "armored_suv" ? armoredRate : suvRate;
    total += rate * hours;
  }

  const surge_mult = 1;
  const quote_amount = Math.round(total * surge_mult);
  const preauth_amount = Math.round(quote_amount * 1.10);

  return j({ quote_amount, currency: "MXN", min_hours, surge_mult, preauth_amount });
});
