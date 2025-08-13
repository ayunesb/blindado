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
  const { booking_id } = body;
  if (!booking_id) return j({ error: "booking_id required" }, 400);

  const { error } = await supabase
    .from("bookings")
    .update({ status: "matching" })
    .eq("id", booking_id);
  if (error) return j({ error: error.message }, 500);

  return j({ ok: true, booking_id });
});
