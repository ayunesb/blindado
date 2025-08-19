// @ts-nocheck
import { serve } from 'std/http/server.ts';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { withCors, rateLimit, tooMany, auditLog } from '../_shared/http.ts';

const Payload = z.object({
  id: z.string().uuid().optional(),
  owner_type: z.enum(['company','freelancer']).optional(),
  owner_id: z.string().uuid().optional(),
  type: z.string().optional(),
  make: z.string().optional(),
  model: z.string().optional(),
  plate: z.string().optional(),
  registration_url: z.string().url().optional(),
  insurance_url: z.string().url().optional(),
  armored_level: z.string().optional(),
  photo_url: z.string().url().optional(),
});

serve(withCors(async (req) => {
  if (req.method !== 'POST') return new Response('{"error":"method"}', { status: 405 });
  const supa = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const auth = (req.headers.get('authorization') || '').replace('Bearer ', '');
  const { data: { user } } = await supa.auth.getUser(auth);
  if (!user) return new Response('{"error":"unauthorized"}', { status: 401 });

  // rate limit per user and function
  const rl = await rateLimit(supa, `vehicle_upsert:${user.id}`, 30, 60);
  if (!rl.allowed) return tooMany();

  const json = await req.json().catch(() => ({}));
  const parsed = Payload.safeParse(json);
  if (!parsed.success) return new Response(JSON.stringify({ error: 'invalid', issues: parsed.error.issues }), { status: 400 });

  // Persist into company_vehicle_docs if owner is company
  const p = parsed.data;
  let id = p.id;
  if (p.owner_type === 'company') {
    // Resolve company_id: prefer explicit owner_id, else from profile
    let companyId = p.owner_id as string | undefined;
    if (!companyId) {
      let profRes: any = await supa.from('profiles').select('company_id').eq('id', user.id).maybeSingle();
      if (profRes.error || !profRes.data) {
        profRes = await supa.from('profiles').select('company_id').eq('user_id', user.id).maybeSingle();
      }
      companyId = profRes?.data?.company_id as string | undefined;
    }
    if (!companyId) return new Response(JSON.stringify({ error: 'no_company' }), { status: 400 });
    const { data, error } = await supa
      .from('company_vehicle_docs')
      .upsert({
        id: id,
        company_id: companyId,
        type: p.type,
        make: p.make,
        model: p.model,
        plate: p.plate,
        armored_level: p.armored_level,
        photo_url: p.photo_url,
        registration_url: p.registration_url,
        insurance_url: p.insurance_url,
      }, { onConflict: 'id' })
      .select('id')
      .single();
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    id = data?.id ?? id;
  } else {
    return new Response(JSON.stringify({ error: 'owner_type company required' }), { status: 400 });
  }

  await auditLog(supa, 'vehicle_upsert', user.id, 'upsert', { id, ...p });
  return new Response(JSON.stringify({ ok: true, id }));
}));
