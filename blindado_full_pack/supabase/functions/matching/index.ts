import { serve } from "serve";
import { createClient } from "supabase";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json"
};

function j(d:any, s=200) { return new Response(JSON.stringify(d), { status:s, headers: corsHeaders }); }
serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return j({ error: "POST only" }, 405);

  const { booking_id } = await req.json();
  if (!booking_id) return j({ error: "booking_id required" }, 400);

  const supabase = createClient(Deno.env.get("BLINDADO_SUPABASE_URL")!, Deno.env.get("BLINDADO_SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: booking, error: bErr } = await supabase.from("bookings").select("*").eq("id", booking_id).single();
  if (bErr || !booking) return j({ error: "booking not found", details: bErr?.message }, 404);

  const { data: guards, error: gErr } = await supabase
    .from("guards")
    .select("id, city, skills, availability_status")
    .eq("availability_status", "online")
    .eq("city", booking.city);

  if (gErr) return j({ error: gErr.message }, 500);

  const candidates = (guards || []).slice(0, 5);
  for (const g of candidates) {
    await supabase.from("assignments").insert({ booking_id, guard_id: g.id, status: "offered" });
  }

  return j({ offered_to: candidates.map(c => c.id) });
});
