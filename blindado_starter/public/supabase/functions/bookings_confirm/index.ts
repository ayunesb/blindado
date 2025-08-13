import { serve } from "serve";
import { createClient } from "supabase";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const { booking_id } = await req.json();
  if (!booking_id) return json({ error: "booking_id required" }, 400);

  const supabase = createClient(
    Deno.env.get("BLINDADO_SUPABASE_URL")!,
    Deno.env.get("BLINDADO_SUPABASE_SERVICE_ROLE_KEY")!
  );

  // 1) Load booking
  const { data: booking, error: bErr } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", booking_id)
    .single();

  if (bErr || !booking) return json({ error: "booking not found", details: bErr?.message }, 404);

  // 2) Move to 'matching'
  await supabase.from("bookings").update({ status: "matching" }).eq("id", booking_id);

  // 3) Very simple eligibility (expand later)
  const { data: guards, error: gErr } = await supabase
    .from("guards")
    .select("id, city, availability_status, skills")
    .eq("availability_status", "online")
    .eq("city", booking.city);

  if (gErr) return json({ error: gErr.message }, 500);

  const armedRequired = !!booking.armed_required;
  const eligible = (guards || []).filter((g: any) =>
    armedRequired ? (g.skills?.armed === true) : true
  );

  const candidates = eligible.slice(0, 5);
  for (const g of candidates) {
    await supabase.from("assignments").insert({
      booking_id,
      guard_id: g.id,
      status: "offered",
    });
  }

  return json({ ok: true, offered_to: candidates.map((c: any) => c.id) });
});

