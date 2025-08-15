import { serve } from 'std/http/server.ts';
import { createClient } from '@supabase/supabase-js';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-admin-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST')
    return new Response(JSON.stringify({ error: 'method' }), { status: 405, headers: cors });

  const secret = Deno.env.get('ADMIN_API_SECRET');
  if (!secret || req.headers.get('x-admin-secret') !== secret)
    return new Response('{"error":"forbidden"}', { status: 403, headers: cors });

  const supa = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const b = await req.json().catch(() => ({}));
  const {
    id,
    user_id,
    company_id,
    first_name,
    last_name,
    armed,
    dress_codes,
    hourly_rate,
    photo_url,
    status,
  } = b;
  const r = await supa
    .from('guards')
    .upsert({
      id,
      user_id,
      company_id,
      first_name,
      last_name,
      armed,
      dress_codes,
      hourly_rate,
      photo_url,
      status,
    })
    .select()
    .single();
  if ((r as any).error)
    return new Response(JSON.stringify({ error: (r as any).error.message }), {
      status: 400,
      headers: cors,
    });
  return new Response(JSON.stringify({ guard_id: (r as any).data.id }), { headers: cors });
});
