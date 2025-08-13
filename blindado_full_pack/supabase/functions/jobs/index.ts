import { serve } from "serve";
import { createClient } from "supabase";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json"
};

function json(data:any, status=200) { return new Response(JSON.stringify(data), { status, headers: corsHeaders }); }
serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  const url = new URL(req.url);
  const path = url.pathname.split("/").pop()!;
  const supabase = createClient(Deno.env.get("BLINDADO_SUPABASE_URL")!, Deno.env.get("BLINDADO_SUPABASE_SERVICE_ROLE_KEY")!);

  if (req.method === "GET" && path === "list") {
    const guard_id = url.searchParams.get("guard_id");
    if (!guard_id) return json({ error: "guard_id required" }, 400);
    const { data, error } = await supabase
      .from("assignments")
      .select("*, bookings(*)")
      .eq("guard_id", guard_id)
      .eq("status", "offered");
    if (error) return json({ error: error.message }, 500);
    return json({ jobs: data ?? [] });
  }

  if (req.method === "POST" && path === "accept") {
    const { assignment_id } = await req.json();
    if (!assignment_id) return json({ error: "assignment_id required" }, 400);

    const { data: current, error: getErr } = await supabase.from("assignments").select("*").eq("id", assignment_id).single();
    if (getErr || !current) return json({ error: "assignment not found" }, 404);
    if (current.status !== "offered") return json({ ok: true, status: current.status });

    const { error: updErr } = await supabase.from("assignments").update({ status: "accepted" }).eq("id", assignment_id);
    if (updErr) return json({ error: updErr.message }, 500);
    await supabase.from("bookings").update({ status: "assigned" }).eq("id", current.booking_id);
    return json({ ok: true });
  }

  if (req.method === "POST" && path === "status") {
    const { assignment_id, status } = await req.json();
    const allowed = ["offered","accepted","check_in","on_site","in_progress","check_out","completed"];
    if (!assignment_id || !allowed.includes(status)) return json({ error: "invalid body" }, 400);
    const { error } = await supabase.from("assignments").update({ status }).eq("id", assignment_id);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  }

  return json({ error: "not found" }, 404);
});
