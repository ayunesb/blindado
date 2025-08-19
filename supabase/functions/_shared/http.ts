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

export function tooMany(msg = "too_many_requests", origin?: string) {
  return new Response(JSON.stringify({ error: msg }), {
    status: Status.TooManyRequests,
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

// Optional helper for handlers that want to early-return preflight
export function preflight(req: Request): Response | null {
  const { headers } = cors(req);
  if (req.method === 'OPTIONS') {
    const h = new Headers(headers as HeadersInit);
    h.set('access-control-max-age', '86400');
    return new Response(null, { status: 204, headers: h });
  }
  return null;
}

// Simple per-key rate limiter using edge_rate_limits table
export async function rateLimit(
  supa: any,
  key: string,
  limit = 30,
  windowSeconds = 60,
) {
  // Reset if expired
  const now = new Date();
  const { data } = await supa
    .from('edge_rate_limits')
    .select('key,count,reset_at')
    .eq('key', key)
    .maybeSingle();
  if (!data) {
    await supa.from('edge_rate_limits').insert({ key, count: 1, reset_at: new Date(now.getTime() + windowSeconds * 1000).toISOString() });
    return { allowed: true, remaining: limit - 1 } as const;
  }
  const resetAt = new Date(data.reset_at);
  if (now >= resetAt) {
    await supa
      .from('edge_rate_limits')
      .update({ count: 1, reset_at: new Date(now.getTime() + windowSeconds * 1000).toISOString() })
      .eq('key', key);
    return { allowed: true, remaining: limit - 1 } as const;
  }
  if (data.count >= limit) return { allowed: false, remaining: 0 } as const;
  await supa.from('edge_rate_limits').update({ count: data.count + 1 }).eq('key', key);
  return { allowed: true, remaining: Math.max(0, limit - (data.count + 1)) } as const;
}

// Minimal audit log helper
function sanitizePayload(obj: unknown): unknown {
  try {
    if (!obj || typeof obj !== 'object') return obj;
    const redactedKeys = [/token/i, /authorization/i, /apikey/i, /secret/i];
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (redactedKeys.some((re) => re.test(k))) {
        out[k] = '<redacted>';
      } else if (typeof v === 'string' && v.startsWith('http')) {
        try {
          const u = new URL(v);
          out[k] = `${u.origin}${u.pathname}`; // drop query/signatures
        } catch {
          out[k] = v;
        }
      } else if (typeof v === 'object' && v !== null) {
        out[k] = sanitizePayload(v);
      } else {
        out[k] = v;
      }
    }
    return out;
  } catch {
    return undefined;
  }
}

export async function auditLog(
  supa: any,
  fn: string,
  actor: string | null,
  action: string,
  payload?: unknown,
) {
  try {
    const safe = sanitizePayload(payload);
    await supa.from('logs_edge').insert({ fn, actor, action, payload: safe });
  } catch {
    // ignore logging failure
  }
}
