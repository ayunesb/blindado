// @ts-nocheck
import { serve } from 'std/http/server.ts';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { withCors, rateLimit, tooMany, auditLog } from '../_shared/http.ts';

const Payload = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().optional(),
  id_doc_url: z.string().url().optional(),
  proof_of_residence_url: z.string().url().optional(),
});

serve(withCors(async (req) => {
  if (req.method !== 'POST') return new Response('{"error":"method"}', { status: 405 });

  const supa = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const auth = (req.headers.get('authorization') || '').replace('Bearer ', '');
  const { data: { user }, error: uerr } = await supa.auth.getUser(auth);
  if (uerr || !user) return new Response('{"error":"unauthorized"}', { status: 401 });

  const rl = await rateLimit(supa, `client_profile_upsert:${user.id}`, 60, 60);
  if (!rl.allowed) return tooMany();

  const json = await req.json().catch(() => ({}));
  const parse = Payload.safeParse(json);
  if (!parse.success) return new Response(JSON.stringify({ error: 'invalid', issues: parse.error.issues }), { status: 400 });
  const { name, email, id_doc_url, proof_of_residence_url } = parse.data;

  let up: any = await supa
    .from('profiles')
    .upsert({ user_id: user.id, full_name: name, email, role: 'client' }, { onConflict: 'user_id' })
    .select('user_id')
    .single();
  if (up.error) {
    // fallback to profiles.id schema
    up = await supa
      .from('profiles')
      .upsert({ id: user.id, full_name: name, email, role: 'client' }, { onConflict: 'id' })
      .select('id')
      .single();
  }
  if (up.error) return new Response(JSON.stringify({ error: up.error.message }), { status: 400 });

  // Optionally record submitted docs in a table; store URLs only
  if (id_doc_url || proof_of_residence_url) {
    await supa.from('guard_documents')
      .insert([
        ...(id_doc_url ? [{ guard_id: user.id, doc_type: 'id', url: id_doc_url }] : []),
        ...(proof_of_residence_url ? [{ guard_id: user.id, doc_type: 'proof_of_residence', url: proof_of_residence_url }] : []),
      ]).select();
  }

  await auditLog(supa, 'client_profile_upsert', user.id, 'upsert', { fields: Object.keys(parse.data) });
  return new Response(JSON.stringify({ ok: true }));
}));
