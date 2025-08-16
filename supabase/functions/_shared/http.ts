// deno-lint-ignore-file no-explicit-any
// @ts-nocheck
import { Status } from "std/http/status.ts";

const ALLOW = [
  "content-type",
  "authorization",
  "apikey",
  "x-admin-secret",
  "stripe-signature",
].join(", ");

export function corsHeaders(origin = "*") {
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": ALLOW,
    "access-control-expose-headers": "content-type",
    vary: "origin",
  } as Record<string, string>;
}

export function ok(data: any, origin?: string, extra?: HeadersInit) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...corsHeaders(origin),
      ...(extra ?? {}),
    },
  });
}

export function badRequest(msg: string, origin?: string) {
  return new Response(JSON.stringify({ error: msg }), {
    status: Status.BadRequest,
    headers: { "content-type": "application/json", ...corsHeaders(origin) },
  });
}

export function unauthorized(msg = "unauthorized", origin?: string) {
  return new Response(JSON.stringify({ error: msg }), {
    status: Status.Unauthorized,
    headers: { "content-type": "application/json", ...corsHeaders(origin) },
  });
}

export function serverError(msg: string, origin?: string) {
  return new Response(JSON.stringify({ error: msg }), {
    status: Status.InternalServerError,
    headers: { "content-type": "application/json", ...corsHeaders(origin) },
  });
}

// Strict allow-list CORS utilities
export function cors(req: Request) {
  const origin = req.headers.get('origin') ?? '';
  const allowed = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const isAllowed = !allowed.length || allowed.includes(origin);
  const base = {
    vary: 'origin',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'authorization,content-type,apikey,x-admin-secret,stripe-signature',
    'access-control-allow-origin': isAllowed ? origin : 'null',
  } as HeadersInit;
  return { ok: isAllowed, headers: base };
}

export function withCors(handler: (req: Request) => Promise<Response> | Response) {
  return async (req: Request) => {
    const { ok, headers } = cors(req);
    if (req.method === 'OPTIONS') {
      const h = new Headers(headers as HeadersInit);
      h.set('access-control-max-age', '86400');
      return new Response(null, { status: 204, headers: h });
    }
    if (!ok) return new Response('Forbidden', { status: 403, headers });
    const res = await handler(req);
    const merged = new Headers(res.headers);
    Object.entries(headers).forEach(([k, v]) => merged.set(k, String(v)));
    return new Response(res.body, { status: res.status, headers: merged });
  };
}
