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

  const supabase = createClient(
    Deno.env.get("BLINDADO_SUPABASE_URL")!,
    Deno.env.get("BLINDADO_SUPABASE_SERVICE_ROLE_KEY")!
  );

  let payload: any = {};
  try { payload = await req.json(); } catch { return j({ error: "invalid JSON body" }, 400); }

  const {
    city, tier,
    armed_required = false,
    vehicle_required = false,
    vehicle_type = null,
    start_ts, end_ts,
    surge_mult = 1.0
  } = payload;

  if (!city || !tier || !start_ts || !end_ts) {
    return j({ error: "missing required fields (city, tier, start_ts, end_ts)" }, 400);
  }

  const start = new Date(start_ts), end = new Date(end_ts);
  if (isNaN(+start) || isNaN(+end) || end <= start) {
    return j({ error: "invalid timestamps; end must be after start (ISO 8601)" }, 400);
  }

  const rawHours = Math.ceil((+end - +start) / 3_600_000);

  const { data: rules, error: ruleErr } = await supabase
    .from("pricing_rules")
    .select("*")
    .ilike("city", city)
    .ilike("tier", tier)
    .limit(1);

  const rule = rules?.[0] as any;
  if (ruleErr || !rule) return j({ error: "pricing rule not found for city/tier" }, 400);

  const min_hours = rule.min_hours ?? 1;
  const hours = Math.max(min_hours, rawHours);

  let guardHourly = rule.base_rate_guard as number;
  if (armed_required) guardHourly = Math.round(guardHourly * (rule.armed_multiplier ?? 1));

  let vehicleTotal = 0;
  if (vehicle_required) {
  if (vehicle_type === "armored_suv") vehicleTotal = (rule.vehicle_rate_armored ?? 0) * hours;
  else vehicleTotal = (rule.vehicle_rate_suv ?? 0) * hours;
  }

  const quote_amount = Math.round((guardHourly * hours + vehicleTotal) * surge_mult);
  const preauth_amount = Math.round(quote_amount * 1.10);

  return j({
    quote_amount,
    currency: "MXN",
    min_hours,
    surge_mult,
    preauth_amount
  });
});
