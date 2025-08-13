// supabase/functions/payments_preauth/index.ts
// Stub that simulates a payment preauthorization and updates booking -> 'preauthorized'
import { serve } from "serve";
import { createClient } from "supabase";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};
function j(body: any, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return j({ error: "POST only" }, 405);

  const supabase = createClient(
    Deno.env.get("BLINDADO_SUPABASE_URL")!,
    Deno.env.get("BLINDADO_SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { booking_id, amount = null } = await req.json();

    if (!booking_id) return j({ error: "booking_id required" }, 400);

    // Insert a payment row (simulated preauth)
    await supabase.from("payments").insert([
      { booking_id, provider: "stripe", preauth_id: "stub_preauth", amount_preauth: amount, status: "preauthorized" }
    ]);

    // Update booking status
    await supabase.from("bookings").update({ status: "preauthorized" }).eq("id", booking_id);

    return j({ ok: true, booking_id });
  } catch (e) {
    return j({ error: String(e) }, 500);
  }
});
