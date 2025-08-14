// supabase/functions/admin_seed/index.ts
// Admin-only seeding endpoint to insert minimal production seeds required for ATs.
// Gated by x-admin-secret and uses service role to bypass RLS.

import { serve } from "std/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function env(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`missing ${name}`);
  return v;
}

serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "method_not_allowed" }), {
        status: 405,
        headers: CORS,
      });
    }

    const adminHeader = req.headers.get("x-admin-secret") ?? "";
    const ADMIN = env("ADMIN_API_SECRET");
    if (adminHeader !== ADMIN) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: CORS,
      });
    }

    const supabase = createClient(
      env("BLINDADO_SUPABASE_URL"),
      env("BLINDADO_SUPABASE_SERVICE_ROLE_KEY"),
    );

    // Parse a minimal payload to optionally limit seeding scope
    let body: any = {};
    try { body = await req.json(); } catch {}
    const mode = (body?.seed ?? body?.mode ?? "all") as string;

    // Minimal seeds required to unblock AT-1 and support demo flows
    const clientId = "1b387371-6711-485c-81f7-79b2174b90fb";
    const guardId = "c38efbac-fd1e-426b-a0ab-be59fd908c8c";

    if (mode === "all") {
      // profiles (id must exist in auth.users in real env; for demo, this is a stub row)
      await supabase.from("profiles").upsert(
        [
          {
            id: clientId,
            role: "client",
            first_name: "Client",
            last_name: "Demo",
            phone_e164: "+5215555555551",
            email: "client@demo.com",
            kyc_status: "verified",
            photo_url: "https://i.pravatar.cc/150?img=5",
          },
          {
            id: guardId,
            role: "guard",
            first_name: "Juan",
            last_name: "Guard",
            phone_e164: "+5215555555552",
            email: "guard@demo.com",
            kyc_status: "verified",
            photo_url: "https://i.pravatar.cc/150?img=12",
          },
        ],
        { onConflict: "id" },
      );

      // guard row
      await supabase.from("guards").upsert(
        [
          {
            id: guardId,
            city: "CDMX",
            skills: { armed: true, driver: true },
            availability_status: "online",
          },
        ],
        { onConflict: "id" },
      );
    }

  // pricing rules
  await supabase.from("pricing_rules").upsert(
      [
        { city: "CDMX", tier: "direct", base_rate_guard: 700, armed_multiplier: 1.5, vehicle_rate_suv: 1500, vehicle_rate_armored: 3000, min_hours: 4 },
        { city: "CDMX", tier: "elite", base_rate_guard: 900, armed_multiplier: 1.6, vehicle_rate_suv: 1800, vehicle_rate_armored: 3600, min_hours: 4 },
        { city: "GDL", tier: "direct", base_rate_guard: 600, armed_multiplier: 1.4, vehicle_rate_suv: 1300, vehicle_rate_armored: 2600, min_hours: 4 },
        { city: "MTY", tier: "corporate", base_rate_guard: 1100, armed_multiplier: 1.7, vehicle_rate_suv: 2200, vehicle_rate_armored: 4400, min_hours: 4 },
      ],
      { onConflict: "city,tier" },
    );
  const res: any = { ok: true, seeded: { rules: 4 } };
  if (mode === "all") Object.assign(res.seeded, { clientId, guardId });

  return new Response(JSON.stringify(res), { status: 200, headers: CORS });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: CORS,
    });
  }
});
