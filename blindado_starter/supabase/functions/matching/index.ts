
import { serve } from "serve";
import { createClient } from "supabase";

serve(async (req) => {
  if (req.method !== "POST") return new Response("POST only", { status: 405 });
  const { booking_id } = await req.json();

  const supabase = createClient(
    Deno.env.get("BLINDADO_SUPABASE_URL")!,
    Deno.env.get("BLINDADO_SUPABASE_SERVICE_ROLE_KEY")!
  );

  // 1) Load booking
  const { data: booking, error: bErr } = await supabase
    .from("bookings").select("*").eq("id", booking_id).single();
  if (bErr || !booking) return new Response(JSON.stringify({ error: "booking not found", details: bErr?.message }), { status: 404 });

  // 2) Find eligible guards (very simplified; expand per spec)
  const { data: guards, error: gErr } = await supabase
    .from("guards")
    .select("id, city, skills, availability_status")
    .eq("availability_status", "online")
    .eq("city", booking.city);
  if (gErr) return new Response(JSON.stringify({ error: gErr.message }), { status: 500 });

  // 3) Offer to first 5 (TODO: push notifications)
  const candidates = (guards || []).slice(0, 5);

  // 4) Create assignment offers
  for (const g of candidates) {
    await supabase.from("assignments").insert({
      booking_id, guard_id: g.id, status: "offered"
    });
  }

  // 5) Move booking to 'assigned' only after first accept (handled by /jobs/accept)
  const res = { offered_to: candidates.map(c => c.id) };
  return new Response(JSON.stringify(res), { headers: { "Content-Type": "application/json" }});
});
