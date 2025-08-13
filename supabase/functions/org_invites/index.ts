import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const URL = Deno.env.get("BLINDADO_SUPABASE_URL") || Deno.env.get("SUPABASE_URL");
const KEY = Deno.env.get("BLINDADO_SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const ADMIN = Deno.env.get("ADMIN_API_SECRET") || "";
const RESEND = Deno.env.get("RESEND_API_KEY") || "";
const INVITE_BASE_URL = Deno.env.get("INVITE_BASE_URL") || "https://app.example.com/invite";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-secret",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};

function randToken(len = 40) {
  const b = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(b).map(x => x.toString(16).padStart(2, "0")).join("");
}

async function sendEmailResend(to: string, subject: string, html: string) {
  if (!RESEND) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${RESEND}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "Blindado <noreply@blindado.mx>", to: [to], subject, html }),
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  const supa = createClient(URL!, KEY!, { auth: { persistSession: false } });

  try {
    if (req.method === "POST") {
      const body = await req.json();
      // Consume: token + user_id
      if (body?.op === "consume") {
        const { token, user_id } = body;
        if (!token || !user_id) return new Response(JSON.stringify({ error: "token and user_id required" }), { status: 400, headers: CORS });
        const { data: inv, error: e1 } = await supa.from("org_invites").select("*").eq("token", token).maybeSingle();
        if (e1 || !inv) return new Response(JSON.stringify({ error: "invalid token" }), { status: 400, headers: CORS });
        if (inv.used) return new Response(JSON.stringify({ error: "token used" }), { status: 400, headers: CORS });
        if (new Date(inv.expires_at).getTime() < Date.now()) return new Response(JSON.stringify({ error: "token expired" }), { status: 400, headers: CORS });

        const { error: e2 } = await supa.from("org_members").insert({ org_id: inv.org_id, profile_id: user_id, role: inv.role });
        if (e2) return new Response(JSON.stringify({ error: e2.message }), { status: 400, headers: CORS });
        await supa.from("org_invites").update({ used: true, used_by: user_id }).eq("token", token);
        return new Response(JSON.stringify({ ok: true, org_id: inv.org_id, role: inv.role }), { headers: CORS });
      }

      // Create (admin only)
      if (req.headers.get("x-admin-secret") !== ADMIN) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: CORS });
      const { org_id, email, role = "member", ttl_hours = 168 } = body || {};
      if (!org_id || !email) return new Response(JSON.stringify({ error: "org_id and email required" }), { status: 400, headers: CORS });

      const token = randToken();
      const expires_at = new Date(Date.now() + ttl_hours * 3600e3).toISOString();
      const { error } = await supa.from("org_invites").insert({ token, org_id, email, role, expires_at });
      if (error) throw error;

      const link = `${INVITE_BASE_URL}?token=${encodeURIComponent(token)}`;
      await sendEmailResend(email, "Invitación a Blindado", `<p>Has sido invitado a Blindado. Únete:</p><p><a href="${link}">${link}</a></p><p>Expira: ${new Date(expires_at).toLocaleString()}</p>`);
      return new Response(JSON.stringify({ ok: true, token, link, expires_at }), { headers: CORS });
    }

    return new Response(JSON.stringify({ error: "method not allowed" }), { status: 405, headers: CORS });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || String(e) }), { status: 500, headers: CORS });
  }
});
