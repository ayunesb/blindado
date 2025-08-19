// @ts-nocheck
import { serve } from 'std/http/server.ts';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { withCors, rateLimit, tooMany, auditLog } from '../_shared/http.ts';

const Doc = z.object({ type: z.string(), url: z.string().url() });
const Payload = z.object({
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  armed: z.boolean().optional(),
  photo_url: z.string().url().optional(),
  dress_codes: z.array(z.string()).optional(),
  documents: z.array(Doc).optional(),
});

serve(withCors(async (req) => {
  if (req.method !== 'POST') return new Response('{"error":"method"}', { status: 405 });
  const supa = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const auth = (req.headers.get('authorization') || '').replace('Bearer ', '');
  const { data: { user } } = await supa.auth.getUser(auth);
  if (!user) return new Response('{"error":"unauthorized"}', { status: 401 });

  const rl = await rateLimit(supa, `freelancer_apply:${user.id}`, 10, 60);
  if (!rl.allowed) return tooMany();

  const json = await req.json().catch(() => ({}));
  const parsed = Payload.safeParse(json);
  if (!parsed.success) return new Response(JSON.stringify({ error: 'invalid', issues: parsed.error.issues }), { status: 400 });
  const p = parsed.data;

  // Ensure profile & guard rows
  await supa.from('profiles').upsert({ id: user.id, role: 'guard', email: user.email ?? null }, { onConflict: 'id' });
  const g = await supa
    .from('guards')
    .upsert({ id: user.id, active: true }, { onConflict: 'id' })
    .select('id')
    .single();
  if ((g as any).error) return new Response(JSON.stringify({ error: (g as any).error.message }), { status: 400 });

  // Save basic info into profiles
  await supa.from('profiles').update({ first_name: p.first_name, last_name: p.last_name, photo_url: p.photo_url ?? null }).eq('id', user.id);

  // Optionally log provided documents into incidents or a docs table if exists
  if (p.documents?.length) {
    try {
      await supa.from('guard_documents').insert(p.documents.map(d => ({ guard_id: user.id, doc_type: d.type, url: d.url })));
    } catch { /* ignore missing table in some envs */ }
  }

  await auditLog(supa, 'freelancer_apply', user.id, 'apply', { with_docs: !!p.documents?.length });
  return new Response(JSON.stringify({ guard_id: user.id }));
}));
