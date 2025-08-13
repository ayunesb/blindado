// supabase/functions/jobs/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json"
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

  const url = new URL(req.url);
  const supa = createClient(
    Deno.env.get("BLINDADO_SUPABASE_URL")!,
    Deno.env.get("BLINDADO_SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    if (req.method === "GET" && url.pathname.endsWith("/list")) {
      const guard_id = url.searchParams.get("guard_id");
      if (!guard_id) return new Response(JSON.stringify({ error: "guard_id required" }), { status: 400, headers: cors });

      // 1) assignments for guard
      const { data: assigns, error: e1 } = await supa
        .from("assignments")
        .select("id, status, booking_id, guard_id")
        .eq("guard_id", guard_id)
        .in("status", ["offered","accepted","check_in","on_site","in_progress"])
        .order("id", { ascending: false });
      if (e1) throw e1;

      if (!assigns?.length) {
        return new Response(JSON.stringify({ items: [] }), { headers: cors });
      }

      // 2) bookings for those assignments
      const bIds = assigns.map(a => a.booking_id);
      const { data: bookings, error: e2 } = await supa
        .from("bookings")
        .select("id, city, tier, start_ts, end_ts, origin_lat, origin_lng, client_id")
        .in("id", bIds);
      if (e2) throw e2;
      const bMap = new Map(bookings.filter(b => bIds.includes(b.id)).map(b => [b.id, b]));

      // 3) client profiles (photo_url)
      const cIds = Array.from(new Set(bookings.filter(b => bIds.includes(b.id)).map(b => b.client_id)));
      const { data: clients, error: e3 } = await supa
        .from("profiles")
        .select("id, first_name, last_name, photo_url")
        .in("id", cIds);
      if (e3) throw e3;
      const cMap = new Map(clients.map(c => [c.id, c]));

      // 4) licenses per guard (for badges)
      const guardIds = Array.from(new Set(assigns.map(a => a.guard_id))).filter(Boolean) as string[];
      let licByGuard: Record<string, Array<{type:string,status:string,valid_to:string|null}>> = {};
      if (guardIds.length) {
        const { data: licRows } = await supa
          .from("licenses")
          .select("guard_id,type,status,valid_to")
          .in("guard_id", guardIds);
        (licRows || []).forEach((l: any) => {
          licByGuard[l.guard_id] ??= [];
          licByGuard[l.guard_id].push({ type: l.type, status: l.status, valid_to: l.valid_to });
        });
      }

      const items = assigns.map(a => {
        const booking: any = bMap.get(a.booking_id) || {};
        const client = cMap.get(booking.client_id) || null;
        const badges = (licByGuard[a.guard_id] || []).map(b => ({ label: b.type, status: b.status, valid_to: b.valid_to }));
        return {
          assignment_id: a.id,
          status: a.status,
          booking_id: a.booking_id,
          guard_id: a.guard_id,
          // flatten booking fields for easier UI consumption
          city: booking.city,
          tier: booking.tier,
          start_ts: booking.start_ts,
          end_ts: booking.end_ts,
          origin_lat: booking.origin_lat,
          origin_lng: booking.origin_lng,
          client,
          license_badges: badges
        };
      });

      return new Response(JSON.stringify({ items }), { headers: cors });
    }

    if (req.method === "POST" && url.pathname.endsWith("/accept")) {
      const { assignment_id } = await req.json();
      if (!assignment_id) return new Response(JSON.stringify({ error:"assignment_id required" }), { status:400, headers:cors });

      // first-accept wins
      const { data: a, error: e0 } = await supa.from("assignments").select("id, booking_id, status").eq("id", assignment_id).single();
      if (e0) throw e0;
      if (a.status !== "offered") return new Response(JSON.stringify({ ok:true, info:"already accepted" }), { headers:cors });

      const { error: e1u } = await supa.from("assignments").update({ status:"accepted" }).eq("id", assignment_id);
      if (e1u) throw e1u;
      const { error: e2u } = await supa.from("bookings").update({ status:"assigned" }).eq("id", a.booking_id);
      if (e2u) throw e2u;

      return new Response(JSON.stringify({ ok:true }), { headers:cors });
    }

    if (req.method === "POST" && url.pathname.endsWith("/status")) {
      const { assignment_id, status } = await req.json();
      const allowed = ["offered","accepted","check_in","on_site","in_progress","check_out","completed"];
      if (!assignment_id || !allowed.includes(status)) {
        return new Response(JSON.stringify({ error:"invalid payload" }), { status:400, headers:cors });
      }
      const patch:any = { status };
      const tsField = { check_in:"check_in_ts", on_site:"on_site_ts", in_progress:"in_progress_ts", check_out:"check_out_ts" }[status];
      if (tsField) patch[tsField] = new Date().toISOString();

      const { error: eU } = await supa.from("assignments").update(patch).eq("id", assignment_id);
      if (eU) throw eU;
      return new Response(JSON.stringify({ ok:true }), { headers:cors });
    }

    return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: cors });
  } catch (err:any) {
    return new Response(JSON.stringify({ error: err?.message || String(err) }), { status: 500, headers: cors });
  }
});
