
import { serve } from "serve";
import { createClient } from "supabase";

serve(async (req) => {
  const body = await req.json().catch(() => ({}));
  const { user_id, status } = body; // status: pending|verified|rejected
  if (!user_id || !status) return new Response("bad request", { status: 400 });

  const supabase = createClient(Deno.env.get("BLINDADO_SUPABASE_URL")!, Deno.env.get("BLINDADO_SUPABASE_SERVICE_ROLE_KEY")!);
  const { error } = await supabase.from("profiles").update({ kyc_status: status }).eq("id", user_id);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response("ok");
});
