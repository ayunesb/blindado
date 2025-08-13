import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

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

  const { booking_id } = await req.json().catch(() => ({}));
  if (!booking_id) return j({ error: "booking_id required" }, 400);

  // Load booking
  const { data: booking, error: bErr } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", booking_id)
    .single();
  if (bErr || !booking) return j({ error: "booking not found", details: bErr?.message }, 404);

  // Eligible guards
  let query = supabase
    .from("guards")
    .select("id, city, skills, availability_status")
    .eq("availability_status", "online")
    .eq("city", booking.city);

  const { data: guards, error: gErr } = await query;
  if (gErr) return j({ error: gErr.message }, 500);

  // Filter by armed skill if required
  const eligible = (guards ?? []).filter(g => {
    if (!booking.armed_required) return true;
    const skills = (g as any).skills || {};
    return !!skills.armed;
  });

  const candidates = eligible.slice(0, 5);

  // Create assignment offers
  for (const g of candidates) {
    await supabase.from("assignments").insert({
      booking_id,
      guard_id: (g as any).id,
      status: "offered"
    });
  }

  return j({ offered_to: candidates.map((c: any) => c.id) });
});
