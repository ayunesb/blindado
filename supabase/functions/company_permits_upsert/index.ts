// @ts-nocheck
import { serve } from 'std/http/server.ts';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { withCors, rateLimit, tooMany, auditLog } from '../_shared/http.ts';

const Payload = z.object({
  insurance_doc_url: z.string().url().optional(),
  collective_gun_permit_url: z.string().url().optional(),
});

serve(withCors(async (req) => {
  if (req.method !== 'POST') return new Response('{"error":"method"}', { status: 405 });
  const supa = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const auth = (req.headers.get('authorization') || '').replace('Bearer ', '');
  const { data: { user } } = await supa.auth.getUser(auth);
  if (!user) return new Response('{"error":"unauthorized"}', { status: 401 });

  const rl = await rateLimit(supa, `company_permits_upsert:${user.id}`, 20, 60);
  if (!rl.allowed) return tooMany();

  const json = await req.json().catch(() => ({}));
  const parsed = Payload.safeParse(json);
  if (!parsed.success) return new Response(JSON.stringify({ error: 'invalid', issues: parsed.error.issues }), { status: 400 });
  const p = parsed.data;

  // Find the caller's company_id via profiles (supports id or user_id schemas)
  let prof: any = await supa.from('profiles').select('company_id').eq('id', user.id).maybeSingle();
  if (prof.error || !prof.data) {
    prof = await supa.from('profiles').select('company_id').eq('user_id', user.id).maybeSingle();
  }
  const company_id = prof?.data?.company_id as string | undefined;
  if (!company_id) return new Response('{"error":"no_company"}', { status: 400 });

  const { data, error } = await supa
    .from('company_permits')
    .upsert({ company_id, insurance_doc_url: p.insurance_doc_url, collective_gun_permit_url: p.collective_gun_permit_url }, { onConflict: 'company_id' })
    .select('id')
    .single();
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });

  await auditLog(supa, 'company_permits_upsert', user.id, 'upsert', { company_id });
  return new Response(JSON.stringify({ ok: true, id: data?.id }));
}));
