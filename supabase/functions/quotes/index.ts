import { serve } from 'std/http/server.ts';
import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, authorization, apikey',
  'Content-Type': 'application/json',
};

function j(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') return j({ error: 'POST only' }, 405);

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || Deno.env.get('BLINDADO_SUPABASE_URL');
  const SERVICE_ROLE =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('BLINDADO_SUPABASE_SERVICE_ROLE_KEY');
  if (!SUPABASE_URL || !SERVICE_ROLE) return j({ error: 'server misconfigured' }, 500);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return j({ error: 'invalid JSON' }, 400);
  }

  const { booking_id, quote } = body || {};
  if (!booking_id || typeof booking_id !== 'string')
    return j({ error: 'booking_id required' }, 400);

  const { error } = await admin
    .from('quotes')
    .upsert(
      { booking_id, payload: quote, created_at: new Date().toISOString() },
      { onConflict: 'booking_id' },
    );
  if (error) return j({ error: error.message }, 500);
  return j({ ok: true, booking_id });
});
