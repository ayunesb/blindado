// @ts-nocheck
import { serve } from "std/http/server.ts";
import * as jose from "https://esm.sh/jose@4.15.5";

const ADMIN = Deno.env.get("ADMIN_API_SECRET") || "";
const HB_SECRET = (Deno.env.get("HEARTBEAT_JWT_SECRET") || "").trim();

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.headers.get("x-admin-secret") !== ADMIN) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: CORS });
  const { guard_id, ttl_seconds = 300 } = await req.json();
  if (!guard_id || !HB_SECRET) return new Response(JSON.stringify({ error: "guard_id and HEARTBEAT_JWT_SECRET required" }), { status: 400, headers: CORS });
  const exp = Math.floor(Date.now() / 1000) + Math.max(60, Math.min(ttl_seconds, 3600));
  const token = await new jose.SignJWT({ gid: guard_id })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(exp)
    .sign(new TextEncoder().encode(HB_SECRET));
  return new Response(JSON.stringify({ token, exp }), { headers: CORS });
});
