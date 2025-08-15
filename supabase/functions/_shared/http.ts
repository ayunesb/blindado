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

export function preflight(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    const origin = req.headers.get("origin") ?? "*";
    return new Response("ok", { headers: corsHeaders(origin) });
  }
  return null;
}
