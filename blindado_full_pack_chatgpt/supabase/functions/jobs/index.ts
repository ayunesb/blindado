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
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  const url = new URL(req.url);
  const path = url.pathname.split("/").pop();
  const supabase = createClient(
    Deno.env.get("BLINDADO_SUPABASE_URL")!,
    Deno.env.get("BLINDADO_SUPABASE_SERVICE_ROLE_KEY")!
  );

  if (req.method === "GET" && path === "list") {
    const guard_id = url.searchParams.get("guard_id");
    if (!guard_id) return j({ error: "guard_id required" }, 400);
    const { data, error } = await supabase
      .from("assignments")
      .select("*, bookings(*)")
      .eq("guard_id", guard_id)
      .in("status", ["offered", "accepted", "check_in", "on_site", "in_progress", "check_out"]);
    if (error) return j({ error: error.message }, 500);
    return j({ jobs: data ?? [] });
  }

  if (req.method === "POST" && path === "accept") {
    const { assignment_id } = await req.json().catch(() => ({}));
    if (!assignment_id) return j({ error: "assignment_id required" }, 400);

    const { data: current, error: getErr } = await supabase
      .from("assignments").select("*").eq("id", assignment_id).single();

    if (getErr || !current) return j({ error: "assignment not found" }, 404);
    if (current.status !== "offered") return j({ ok: true, status: current.status });

    const { error: updErr } = await supabase.from("assignments")
      .update({ status: "accepted" }).eq("id", assignment_id);
    if (updErr) return j({ error: updErr.message }, 500);

    await supabase.from("bookings").update({ status: "assigned" }).eq("id", current.booking_id);
    return j({ ok: true });
  }

  if (req.method === "POST" && path === "status") {
    const { assignment_id, status } = await req.json().catch(() => ({}));
    const allowed = ["offered","accepted","check_in","on_site","in_progress","check_out","completed"];
    if (!assignment_id || !allowed.includes(status)) return j({ error: "invalid payload" }, 400);
    const { error } = await supabase.from("assignments").update({ status }).eq("id", assignment_id);
    if (error) return j({ error: error.message }, 500);
    return j({ ok: true });
  }

  return j({ error: "not found" }, 404);
});
