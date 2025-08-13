import { serve } from "serve";
import { createClient } from "supabase";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json"
};
const j = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return j({ error: "POST only" }, 405);

  const supabase = createClient(
    Deno.env.get("BLINDADO_SUPABASE_URL")!,
    Deno.env.get("BLINDADO_SUPABASE_SERVICE_ROLE_KEY")!
  );

  const body = await req.json().catch(() => ({}));
  const { booking_id, amount } = body;
  if (!booking_id || typeof amount !== "number") {
    return j({ error: "booking_id and numeric amount are required" }, 400);
    }

  // Create a payments row (stub)
  const { error: payErr } = await supabase.from("payments").insert([{
    booking_id,
    provider: "stripe",
    preauth_id: crypto.randomUUID(),
    amount_preauth: amount,
    status: "preauthorized"
  }]);
  if (payErr) return j({ error: payErr.message }, 500);

  // Update booking status -> preauthorized
  const { error: updErr } = await supabase
    .from("bookings")
    .update({ status: "preauthorized" })
    .eq("id", booking_id);
  if (updErr) return j({ error: updErr.message }, 500);

  return j({ ok: true });
});
