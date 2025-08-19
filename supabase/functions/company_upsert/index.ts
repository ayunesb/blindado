import { serve } from 'std/http/server.ts';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { withCors } from '../_shared/http.ts';

const Payload = z.object({
  company_name: z.string().min(1).max(200),
  contact_name: z.string().min(1).max(200).optional(),
  contact_email: z.string().email().optional(),
  tax_id: z.string().max(64).optional(),
  payout_account_id: z.string().max(128).optional(),
});

serve(withCors(async (req) => {
  if (req.method !== 'POST') return new Response('{"error":"method"}', { status: 405 });

  const supa = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const auth = (req.headers.get('authorization') || '').replace('Bearer ', '');
  const { data: { user } } = await supa.auth.getUser(auth);
  if (!user) return new Response('{"error":"unauthorized"}', { status: 401 });

  const json = await req.json().catch(() => ({}));
  const parse = Payload.safeParse(json);
  if (!parse.success) return new Response(JSON.stringify({ error: 'invalid', issues: parse.error.issues }), { status: 400 });
  const { company_name, contact_name, contact_email, tax_id, payout_account_id } = parse.data;

  const up = await supa
    .from('companies')
    .upsert({ name: company_name, contact_name, contact_email, tax_id, stripe_account_id: payout_account_id, created_by: user.id }, { onConflict: 'name' })
    .select('id')
    .single();
  if ((up as any).error) return new Response(JSON.stringify({ error: (up as any).error.message }), { status: 400 });

  await supa
    .from('profiles')
    .upsert({ user_id: user.id, role: 'company_admin', company_id: (up as any).data.id }, { onConflict: 'user_id' });

  return new Response(JSON.stringify({ ok: true, company_id: (up as any).data.id }));
}));
