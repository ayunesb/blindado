
import { serve } from "serve";
import { createClient } from "supabase";

serve(async (req) => {
  if (req.method !== "POST") return new Response("POST only", { status: 405 });
  const { booking_id, created_by, narrative } = await req.json();
  const supabase = createClient(Deno.env.get("BLINDADO_SUPABASE_URL")!, Deno.env.get("BLINDADO_SUPABASE_SERVICE_ROLE_KEY")!);
  const { error } = await supabase.from("incidents").insert({
    booking_id, created_by, type: "SOS", severity: 3, narrative
  });
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  // TODO: Notify admin/dispatch via webhook or push
  return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" }});
});
