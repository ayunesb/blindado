import { serve } from "serve";
import { createClient } from "supabase";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...cors } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "not found" }, 404);

  const { booking_id } = await req.json().catch(() => ({}));
  if (!booking_id) return json({ error: "booking_id required" }, 400);

  const supabase = createClient(
    Deno.env.get("BLINDADO_SUPABASE_URL"),
    Deno.env.get("BLINDADO_SUPABASE_SERVICE_ROLE_KEY")
  );

  const { error } = await supabase.from("bookings").update({ status: "matching" }).eq("id", booking_id);
  if (error) return json({ error: error.message }, 500);

  return json({ ok: true });
});
