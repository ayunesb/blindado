// @ts-nocheck
import { serve } from 'std/http/server.ts';
import { createClient } from '@supabase/supabase-js';
import { withCors } from "../_shared/http.ts";

function j(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

// Infer canonical city from lat/lng. Minimal bounding boxes for MVP.
function cityFromLatLng(lat?: number | null, lng?: number | null): string | null {
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  // CDMX approx
  if (lat >= 19.0 && lat <= 19.8 && lng >= -99.35 && lng <= -98.8) return 'CDMX';
  // Guadalajara (GDL) approx
  if (lat >= 20.5 && lat <= 20.9 && lng >= -103.6 && lng <= -103.1) return 'GDL';
  // Monterrey (MTY) approx
  if (lat >= 25.4 && lat <= 26.0 && lng >= -100.5 && lng <= -99.9) return 'MTY';
  return null;
}

serve(withCors(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 });
  if (req.method !== 'POST') return j({ error: 'POST only' }, 405);

  // Prefer standard env names, fallback to BLINDADO_* if present
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || Deno.env.get('BLINDADO_SUPABASE_URL');
  const SERVICE_ROLE =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('BLINDADO_SUPABASE_SERVICE_ROLE_KEY');
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    try {
      console.error('missing env SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY');
    } catch {}
    return j({ error: 'server misconfigured' }, 500);
  }
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  let payload: any = {};
  try {
    payload = await req.json();
  } catch {
    return j({ error: 'invalid JSON body' }, 400);
  }

  const {
    city: cityInput,
    tier,
    armed_required = false,
    vehicle_required = false,
    vehicle_type = null,
    start_ts,
    end_ts,
    origin_lat = undefined,
    origin_lng = undefined,
    origin = undefined,
    surge_mult = 1.0,
  } = payload;

  // Derive city from lat/lng when available
  const oLat = typeof origin?.lat === 'number' ? origin.lat : origin_lat;
  const oLng = typeof origin?.lng === 'number' ? origin.lng : origin_lng;
  const cityDerived = cityFromLatLng(oLat, oLng);
  const city = cityDerived ?? cityInput;

  if (!city || !tier || !start_ts || !end_ts) {
    return j({ error: 'missing required fields (city, tier, start_ts, end_ts)' }, 400);
  }

  const start = new Date(start_ts),
    end = new Date(end_ts);
  if (isNaN(+start) || isNaN(+end) || end <= start) {
    return j({ error: 'invalid timestamps; end must be after start (ISO 8601)' }, 400);
  }

  const rawHours = Math.ceil((+end - +start) / 3_600_000);

  // Debug trace (can be removed later)
  try {
    console.log('pricing.lookup', {
      city_input: cityInput,
      city_derived: cityDerived,
      city_used: city,
      tier,
    });
  } catch {}

  // Prefer RPC (case-insensitive, index-friendly), fallback to ilike if RPC is missing
  let rule: any | null = null;
  try {
    const { data: rpcRule, error: rpcErr } = await admin
      .rpc('get_pricing_rule_ci', { p_city: city, p_tier: tier })
      .single();
    if (!rpcErr && rpcRule) rule = rpcRule;
  } catch (_) {
    // ignore; will fall back to ilike
  }

  if (!rule) {
    const { data: rules, error: ruleErr } = await admin
      .from('pricing_rules')
      .select('*')
      .ilike('city', city)
      .ilike('tier', tier)
      .limit(1);
    rule = rules?.[0] as any;
  if (ruleErr || !rule) return j({ error: 'pricing rule not found for city/tier' }, 400);
  }

  const min_hours = rule.min_hours ?? 1;
  const hours = Math.max(min_hours, rawHours);

  let guardHourly = rule.base_rate_guard as number;
  if (armed_required) guardHourly = Math.round(guardHourly * (rule.armed_multiplier ?? 1));

  let vehicleTotal = 0;
  if (vehicle_required) {
    if (vehicle_type === 'armored_suv') vehicleTotal = (rule.vehicle_rate_armored ?? 0) * hours;
    else vehicleTotal = (rule.vehicle_rate_suv ?? 0) * hours;
  }

  const quote_amount = Math.round((guardHourly * hours + vehicleTotal) * surge_mult);
  const preauth_amount = Math.round(quote_amount * 1.1);

  return j({
    quote_amount,
    currency: 'MXN',
    min_hours,
    surge_mult,
    preauth_amount,
  });
}));
