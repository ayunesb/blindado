// @ts-nocheck
import { serve } from 'std/http/server.ts';
import { withCors } from "../_shared/http.ts";

serve(withCors(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 });
  if (req.method !== 'GET') return new Response('Method Not Allowed', { status: 405 });
  return new Response(JSON.stringify({ ok: true, time: new Date().toISOString() }), {
    headers: { 'content-type': 'application/json' },
  });
}));
