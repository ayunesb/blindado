import { serve } from "serve";
import { createClient } from "supabase";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json"
};

function j(d: any, s=200) { return new Response(JSON.stringify(d), { status: s, headers: corsHeaders }); }
serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return j({ error: "POST only" }, 405);

  const supabase = createClient(Deno.env.get("BLINDADO_SUPABASE_URL")!, Deno.env.get("BLINDADO_SUPABASE_SERVICE_ROLE_KEY")!);
  const { booking_id } = await req.json();

  if (!booking_id) return j({ error: "booking_id required" }, 400);

  const { error } = await supabase.from("bookings").update({ status: "matching" }).eq("id", booking_id);
  if (error) return j({ error: error.message }, 500);

  return j({ ok: true, booking_id });
});
