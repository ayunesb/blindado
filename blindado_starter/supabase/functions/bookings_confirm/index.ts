import { serve } from "serve";
import { createClient } from "supabase";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};
const json = (d: unknown, s = 200) =>
  new Response(JSON.stringify(d), {
    status: s,
    headers: { "Content-Type": "application/json", ...cors }
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const supabase = createClient(
    Deno.env.get("BLINDADO_SUPABASE_URL")!,
    Deno.env.get("BLINDADO_SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { booking_id } = await req.json().catch(() => ({}));
  if (!booking_id) return json({ error: "booking_id required" }, 400);

  // 1) Load booking
  const { data: booking, error: bErr } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", booking_id)
    .single();
  if (bErr || !booking) return json({ error: "booking not found" }, 404);

  // 2) Put booking into matching (idempotent)
  await supabase.from("bookings").update({ status: "matching" }).eq("id", booking_id);

  // 3) Find eligible guards (simple v1)
  const { data: guards, error: gErr } = await supabase
    .from("guards")
    .select("id, city, skills, availability_status")
    .eq("availability_status", "online")
    .eq("city", booking.city);
  if (gErr) return json({ error: gErr.message }, 500);

  const eligible = (guards ?? []).filter((g: any) =>
    booking.armed_required ? g?.skills?.armed === true : true
  );

  const top5 = eligible.slice(0, 5);

  // 4) Create assignment offers
  for (const g of top5) {
    await supabase.from("assignments").insert({
      booking_id,
      guard_id: g.id,
      status: "offered"
    });
  }

  return json({ ok: true, offered_to: top5.map((g: any) => g.id) });
});
