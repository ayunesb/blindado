
import { serve } from "serve";
import { createClient } from "supabase";

serve(async (req) => {
  if (req.method !== "POST") return new Response("POST only", { status: 405 });
  const { booking_id, sender_id, text, media_url } = await req.json();
  const supabase = createClient(Deno.env.get("BLINDADO_SUPABASE_URL")!, Deno.env.get("BLINDADO_SUPABASE_SERVICE_ROLE_KEY")!);
  const { error } = await supabase.from("messages").insert({ booking_id, sender_id, text, media_url });
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" }});
});
