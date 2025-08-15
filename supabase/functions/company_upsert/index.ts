import { serve } from 'std/http/server.ts';
import { createClient } from '@supabase/supabase-js';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST')
    return new Response(JSON.stringify({ error: 'method' }), { status: 405, headers: cors });

  const supa = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const auth = (req.headers.get('authorization') || '').replace('Bearer ', '');
  const {
    data: { user },
  } = await supa.auth.getUser(auth);
  if (!user) return new Response('{"error":"unauthorized"}', { status: 401, headers: cors });

  const b = await req.json().catch(() => ({}));
  const { id, name, tax_id, contact_name, contact_email, contact_phone, cities = [], status } = b;
  const up = await supa
    .from('companies')
    .upsert({
      id,
      name,
      tax_id,
      contact_name,
      contact_email,
      contact_phone,
      cities,
      status,
      created_by: user.id,
    })
    .select()
    .single();
  if ((up as any).error)
    return new Response(JSON.stringify({ error: (up as any).error.message }), {
      status: 400,
      headers: cors,
    });
  await supa
    .from('profiles')
    .upsert(
      { user_id: user.id, role: 'company_admin', company_id: (up as any).data.id },
      { onConflict: 'user_id' },
    );
  return new Response(JSON.stringify({ company_id: (up as any).data.id }), { headers: cors });
});
