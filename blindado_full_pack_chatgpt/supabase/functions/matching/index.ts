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

  const { booking_id } = await req.json().catch(() => ({}));
  if (!booking_id) return j({ error: "booking_id required" }, 400);

  const supabase = createClient(
    Deno.env.get("BLINDADO_SUPABASE_URL")!,
    Deno.env.get("BLINDADO_SUPABASE_SERVICE_ROLE_KEY")!
  );

  // 1) Load booking
  const { data: booking, error: bErr } = await supabase.from("bookings").select("*").eq("id", booking_id).single();
  if (bErr || !booking) return j({ error: "booking not found", details: bErr?.message }, 404);

  // 2) Find eligible guards (simple v1: same city and online)
  const { data: guards, error: gErr } = await supabase
    .from("guards")
    .select("id, city, skills, availability_status")
    .eq("availability_status", "online")
    .eq("city", booking.city);

  if (gErr) return j({ error: gErr.message }, 500);

  const candidates = (guards ?? []).slice(0, 5);

  for (const g of candidates) {
    await supabase.from("assignments").insert({
      booking_id, guard_id: g.id, status: "offered"
    });
  }

  return j({ offered_to: candidates.map((c:any) => c.id) });
});
