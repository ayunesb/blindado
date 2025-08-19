// @ts-nocheck
import { serve } from 'std/http/server.ts';
import { createClient } from '@supabase/supabase-js';
import { preflight, ok, badRequest, serverError, withCors, rateLimit, tooMany, auditLog } from '../_shared/http.ts';
import { z } from 'zod';

function cityFromLatLng(lat?: number | null, lng?: number | null): string | null {
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  if (lat >= 19.0 && lat <= 19.8 && lng >= -99.35 && lng <= -98.8) return 'CDMX';
  if (lat >= 20.5 && lat <= 20.9 && lng >= -103.6 && lng <= -103.1) return 'GDL';
  if (lat >= 25.4 && lat <= 26.0 && lng >= -100.5 && lng <= -99.9) return 'MTY';
  return null;
}

serve(withCors(async (req: Request) => {
  const pf = preflight(req);
  if (pf) return pf;
  const origin = req.headers.get('origin') ?? '*';
  if (req.method !== 'POST') return badRequest('POST only', origin);

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || Deno.env.get('BLINDADO_SUPABASE_URL');
  const SERVICE_ROLE =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('BLINDADO_SUPABASE_SERVICE_ROLE_KEY');
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return serverError('server misconfigured', origin);
  }
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  // Derive actor for rate limiting and audit
  const auth = (req.headers.get('authorization') || '').replace('Bearer ', '');
  const { data: authData } = await supabase.auth.getUser(auth);
  const actor = authData?.user?.id ?? null;
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  const rlKey = `bookings:${actor ?? 'ip:' + ip}`;
  const rl = await rateLimit(supabase, rlKey, 60, 60);
  if (!rl.allowed) return tooMany('rate_limited', origin);

  const body = await req.json().catch(() => ({}));
  const Payload = z.object({
    client_id: z.string().uuid().optional().nullable(),
    city: z.string().min(2).max(50).optional().nullable(),
    tier: z.enum(['direct','elite','corporate']).default('direct'),
    armed_required: z.boolean().optional().default(false),
    vehicle_required: z.boolean().optional().default(false),
    vehicle_type: z.string().optional().nullable(),
    start_ts: z.union([z.string(), z.number()]),
    end_ts: z.union([z.string(), z.number()]),
    origin: z.object({ lat: z.number(), lng: z.number() }).optional(),
    origin_lat: z.number().optional().nullable(),
    origin_lng: z.number().optional().nullable(),
    dest_lat: z.number().optional().nullable(),
    dest_lng: z.number().optional().nullable(),
    pickup_address: z.string().optional().nullable(),
    dress_code: z.string().optional().nullable(),
    protectees: z.any().optional(),
    protectors: z.any().optional(),
    vehicles: z.any().optional(),
    notes: z.string().optional().nullable(),
  });
  const parsed = Payload.safeParse(body);
  if (!parsed.success) return badRequest('invalid payload', origin);
  const p = parsed.data;
  // Accept richer payload; normalize origin
  const originObj = p && typeof p.origin === 'object' ? p.origin : null;
  const origin_lat = Number.isFinite(originObj?.lat)
    ? Number(originObj.lat)
    : Number.isFinite(p.origin_lat)
      ? Number(p.origin_lat)
      : null;
  const origin_lng = Number.isFinite(originObj?.lng)
    ? Number(originObj.lng)
    : Number.isFinite(p.origin_lng)
      ? Number(p.origin_lng)
      : null;

  const client_id = p.client_id ?? null;
  const cityInput = p.city ?? null;
  const tier = p.tier ?? 'direct';
  const armed_required = p.armed_required ?? false;
  const vehicle_required = p.vehicle_required ?? false;
  const vehicle_type = p.vehicle_type ?? null;
  const start_ts = p.start_ts;
  const end_ts = p.end_ts;
  const dest_lat = p.dest_lat ?? null;
  const dest_lng = p.dest_lng ?? null;
  const pickup_address = p.pickup_address ?? null;
  const dress_code = p.dress_code ?? null;
  const protectees = p.protectees ?? null;
  const protectors = p.protectors ?? null;
  const vehicles = p.vehicles ?? null;
  const notes = p.notes ?? null;

  const derivedCity = cityFromLatLng(origin_lat, origin_lng);
  const city = derivedCity ?? cityInput;

  // Keep validation on city/tier/start/end; client_id is optional in this flow
  if (!start_ts || !end_ts || !city) {
    return badRequest('city, start_ts, end_ts are required', origin);
  }

  const { data, error } = await supabase
    .from('bookings')
    .insert([
      {
        client_id,
        city,
        tier,
        armed_required,
        vehicle_required,
        vehicle_type,
        start_ts,
        end_ts,
        origin_lat,
        origin_lng,
        dest_lat,
        dest_lng,
        pickup_address,
        dress_code,
        protectees,
        protectors,
        vehicles,
        notes,
        status: 'quoted',
      },
    ])
    .select('id')
    .single();

  if (error) return serverError(error.message, origin);
  await auditLog(supabase, 'bookings', actor, 'insert', { booking_id: data.id });
  return ok({ ok: true, booking_id: data.id }, origin);
}));
