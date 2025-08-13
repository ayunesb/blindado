import { serve } from "serve";
import { createClient } from "supabase";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};

function j(body: unknown, status = 200) {
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
  try {
    payload = await req.json();
  } catch {
    return j({ error: "invalid JSON body" }, 400);
  }

  const {
    city,
    tier,
    armed_required = false,
    vehicle_required = false,
    start_ts,
    end_ts,
  } = payload;

  if (!city || !tier || !start_ts || !end_ts) {
    return j({ error: "missing required fields (city, tier, start_ts, end_ts)" }, 400);
  }

  const start = new Date(start_ts);
  const end = new Date(end_ts);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return j({ error: "invalid timestamps; use ISO 8601" }, 400);
  }

  const rawHours = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60));
  if (rawHours <= 0) return j({ error: "end_ts must be after start_ts" }, 400);

  const { data: rule, error } = await supabase
    .from("pricing_rules")
    .select("base_rate_guard, armed_multiplier, vehicle_rate_suv, min_hours")
    .eq("city", city)
    .eq("tier", tier)
    .single();

  if (error || !rule) return j({ error: "pricing rule not found for city/tier" }, 404);

  const min_hours = rule.min_hours ?? 1;
  const billedHours = Math.max(min_hours, rawHours);

  let hourly = rule.base_rate_guard;
  if (armed_required) hourly = Math.round(hourly * (rule.armed_multiplier ?? 1));

  let total = hourly * billedHours;
  if (vehicle_required) total += rule.vehicle_rate_suv ?? 0;

  const surge_mult = 1;
  const quote_amount = total * surge_mult;
  const preauth_amount = Math.round(quote_amount * 1.10);

  return j({ quote_amount, currency: "MXN", min_hours, surge_mult, preauth_amount });
});
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};

function j(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

serve(async (req) => {
  // Preflight for browsers
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return j({ error: "POST only" }, 405);

  const supabase = createClient(
    Deno.env.get("BLINDADO_SUPABASE_URL")!,
    Deno.env.get("BLINDADO_SUPABASE_SERVICE_ROLE_KEY")!
  );

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return j({ error: "invalid JSON body" }, 400);
  }

  const {
    city,
    tier,
    armed_required = false,
    vehicle_required = false,
    start_ts,
    end_ts,
  } = payload;

  if (!city || !tier || !start_ts || !end_ts) {
    return j({ error: "missing required fields (city, tier, start_ts, end_ts)" }, 400);
  }

  const start = new Date(start_ts);
  const end = new Date(end_ts);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return j({ error: "invalid timestamps; use ISO 8601" }, 400);
  }

  const rawHours = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60));
  if (rawHours <= 0) return j({ error: "end_ts must be after start_ts" }, 400);

  const { data: rule, error } = await supabase
    .from("pricing_rules")
    .select("base_rate_guard, armed_multiplier, vehicle_rate_suv, min_hours")
    .eq("city", city)
    .eq("tier", tier)
    .single();

  if (error || !rule) return j({ error: "pricing rule not found for city/tier" }, 404);

  const min_hours = rule.min_hours ?? 1;
  const billedHours = Math.max(min_hours, rawHours);

  let hourly = rule.base_rate_guard;
  if (armed_required) hourly = Math.round(hourly * (rule.armed_multiplier ?? 1));

  let total = hourly * billedHours;
  if (vehicle_required) total += rule.vehicle_rate_suv ?? 0;

  const surge_mult = 1;
  const quote_amount = total * surge_mult;
  const preauth_amount = Math.round(quote_amount * 1.10); // 10% hold

  return j({ quote_amount, currency: "MXN", min_hours, surge_mult, preauth_amount });
});

import { serve } from "serve";

// Simple pricing v1 based on request payload and mocked rules (replace with DB fetch)
serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), { status: 405 });
  }
  const body = await req.json();
  const {
    city, tier = "direct", armed_required = false,
    vehicle_required = false, vehicle_type = null,
    start_ts, end_ts, surge_mult = 1.0
  } = body;

  // Duration (hours)
  const start = new Date(start_ts).getTime();
  const end = new Date(end_ts).getTime();
  const durationHrs = Math.max(0.5, (end - start) / (1000 * 60 * 60));

  // TODO: fetch from pricing_rules where city,tier
  const rules = {
    base_rate_guard: 700, // MXN/hr
    armed_multiplier: 1.5,
    vehicle_rate_suv: 1500,
    vehicle_rate_armored: 3000,
    min_hours: 4
  };

  const hours = Math.max(rules.min_hours, durationHrs);
  let guardTotal = rules.base_rate_guard * hours;
  if (armed_required) guardTotal *= rules.armed_multiplier;

  let vehicleTotal = 0;
  if (vehicle_required) {
    if (vehicle_type === "armored_suv") vehicleTotal = rules.vehicle_rate_armored * hours;
    else vehicleTotal = rules.vehicle_rate_suv * hours;
  }

  const quote = Math.round((guardTotal + vehicleTotal) * surge_mult);
  const preauth = Math.round(quote * 1.1); // 10% buffer

  return new Response(JSON.stringify({
    quote_amount: quote, currency: "MXN",
    min_hours: rules.min_hours, surge_mult, preauth_amount: preauth
  }), { headers: { "Content-Type": "application/json" }});
});
