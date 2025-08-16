// @ts-nocheck
import { serve } from 'std/http/server.ts';
import { preflight, withCors } from '../_shared/http.ts';
import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
};

const j = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

serve(withCors(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;

  const url = new URL(req.url);
  // Prefer standard SUPABASE_* envs; fall back to BLINDADO_* (older naming)
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || Deno.env.get('BLINDADO_SUPABASE_URL');
  const SERVICE_ROLE =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('BLINDADO_SUPABASE_SERVICE_ROLE_KEY');
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return j({ error: 'server misconfigured' }, 500);
  }
  try {
    console.log('locations.env', {
      used: SUPABASE_URL.includes('supabase.co') ? 'SUPABASE_*' : 'BLINDADO_*',
    });
  } catch {}
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
    if (req.method === 'POST') {
      const { op, guard_id, lat, lng, speed = 0 } = await req.json();
      if (op !== 'heartbeat') return j({ error: 'unknown op' }, 400);
      if (!guard_id || typeof lat !== 'number' || typeof lng !== 'number')
        return j({ error: 'missing guard_id/lat/lng' }, 400);

      const { error } = await supabase
        .from('guards')
        .update({ home_lat: lat, home_lng: lng, availability_status: 'online' })
        .eq('id', guard_id);
      if (error) return j({ error: error.message }, 500);

      return j({ ok: true });
    }

    if (req.method === 'GET') {
      // Query: guard_id to fetch last known location, or lat/lng/radius to search nearby
      const guard_id = url.searchParams.get('guard_id');
      if (guard_id) {
        const { data, error } = await supabase
          .from('guards')
          .select('id, home_lat, home_lng, availability_status')
          .eq('id', guard_id)
          .maybeSingle();
        if (error) return j({ error: error.message }, 500);
        if (!data) return j({ error: 'not found' }, 404);
        return j(data);
      }

      const lat = parseFloat(url.searchParams.get('lat') || 'nan');
      const lng = parseFloat(url.searchParams.get('lng') || 'nan');
      const radiusKm = parseFloat(url.searchParams.get('radius_km') || '5');
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        // naive filter; proper geo index omitted for MVP
        const { data, error } = await supabase
          .from('guards')
          .select('id, home_lat, home_lng, availability_status');
        if (error) return j({ error: error.message }, 500);
        const within = (data || []).filter(
          (g) =>
            g.home_lat != null &&
            g.home_lng != null &&
            haversineKm(lat, lng, parseFloat(String(g.home_lat)), parseFloat(String(g.home_lng))) <=
              radiusKm,
        );
        return j({ items: within });
      }

      return j({ error: 'provide guard_id or lat/lng' }, 400);
    }

    return j({ error: 'method not allowed' }, 405);
  } catch (e) {
    return j({ error: String(e?.message || e) }, 500);
  }
}));

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
