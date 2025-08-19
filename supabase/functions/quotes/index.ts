// @ts-nocheck
import { serve } from 'std/http/server.ts';
import { createClient } from '@supabase/supabase-js';
import { withCors } from "../_shared/http.ts";
import { rateLimit, tooMany, auditLog } from "../_shared/http.ts";
import { z } from 'zod';

function j(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

serve(withCors(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 });
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

  const Payload = z.object({
    booking_id: z.string().uuid(),
    quote: z.any(),
  });
  const parsed = Payload.safeParse(body || {});
  if (!parsed.success) return j({ error: 'invalid payload' }, 400);
  const { booking_id, quote } = parsed.data;

  // rate limit based on actor or IP
  const auth = (req.headers.get('authorization') || '').replace('Bearer ', '');
  const { data: authData } = await admin.auth.getUser(auth);
  const actor = authData?.user?.id ?? null;
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  const rl = await rateLimit(admin, `quotes:${actor ?? 'ip:' + ip}`, 120, 60);
  if (!rl.allowed) return tooMany();

  const { error } = await admin
    .from('quotes')
    .upsert(
      { booking_id, payload: quote, created_at: new Date().toISOString() },
      { onConflict: 'booking_id' },
    );
  if (error) return j({ error: error.message }, 500);
  await auditLog(admin, 'quotes', actor, 'upsert', { booking_id });
  return j({ ok: true, booking_id });
}));
