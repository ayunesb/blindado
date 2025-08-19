// @ts-nocheck
import { serve } from 'std/http/server.ts';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { withCors, rateLimit, tooMany, auditLog } from '../_shared/http.ts';

const Payload = z.object({
  id: z.string().uuid().optional(),
  company_id: z.string().uuid().optional(),
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  id_doc_url: z.string().url().optional(),
  gun_permit_url: z.string().url().optional(),
  driver_license_url: z.string().url().optional(),
  photo_formal_url: z.string().url().optional(),
  photo_casual_url: z.string().url().optional(),
});

serve(withCors(async (req) => {
  if (req.method !== 'POST') return new Response('{"error":"method"}', { status: 405 });
  const supa = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const auth = (req.headers.get('authorization') || '').replace('Bearer ', '');
  const { data: { user } } = await supa.auth.getUser(auth);
  if (!user) return new Response('{"error":"unauthorized"}', { status: 401 });

  const rl = await rateLimit(supa, `company_staff_upsert:${user.id}`, 60, 60);
  if (!rl.allowed) return tooMany();

  const json = await req.json().catch(() => ({}));
  const parsed = Payload.safeParse(json);
  if (!parsed.success) return new Response(JSON.stringify({ error: 'invalid', issues: parsed.error.issues }), { status: 400 });
  const p = parsed.data;

  // Determine company id from profile if not provided
  let companyId = p.company_id as string | undefined;
  if (!companyId) {
    let profRes: any = await supa.from('profiles').select('company_id').eq('id', user.id).maybeSingle();
    if (profRes.error || !profRes.data) {
      profRes = await supa.from('profiles').select('company_id').eq('user_id', user.id).maybeSingle();
    }
    companyId = profRes?.data?.company_id as string | undefined;
  }
  if (!companyId) return new Response('{"error":"no_company"}', { status: 400 });

  const { data, error } = await supa
    .from('company_staff')
    .upsert({
      id: p.id,
      company_id: companyId,
      name: p.name,
      email: p.email,
      address: p.address,
      id_doc_url: p.id_doc_url,
      gun_permit_url: p.gun_permit_url,
      driver_license_url: p.driver_license_url,
      photo_formal_url: p.photo_formal_url,
      photo_casual_url: p.photo_casual_url,
    }, { onConflict: 'id' })
    .select('id')
    .single();
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });

  const id = data?.id ?? p.id;
  await auditLog(supa, 'company_staff_upsert', user.id, 'upsert', { id, company_id: companyId });
  return new Response(JSON.stringify({ ok: true, id }));
}));
