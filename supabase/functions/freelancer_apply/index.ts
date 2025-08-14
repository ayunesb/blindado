import { serve } from "std/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "method" }), { status: 405, headers: cors });

  const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const auth = (req.headers.get("authorization") || "").replace("Bearer ", "");
  const { data: { user } } = await supa.auth.getUser(auth);
  if (!user) return new Response('{"error":"unauthorized"}', { status: 401, headers: cors });

  const b = await req.json().catch(()=>({}));
  const { first_name, last_name, armed=false, dress_codes=[], photo_url, documents=[] } = b;
  await supa.from("profiles").upsert({ user_id: user.id, role: "freelancer" }, { onConflict: "user_id" });
  const g = await supa.from("guards").upsert({ user_id: user.id, first_name, last_name, armed, dress_codes, photo_url, status: "pending_review" }, { onConflict: "user_id" }).select().single();
  if ((g as any).error) return new Response(JSON.stringify({ error: (g as any).error.message }), { status: 400, headers: cors });
  for (const d of (documents||[])) { await supa.from("guard_documents").insert({ guard_id: (g as any).data.id, doc_type: d.type, url: d.url }); }
  return new Response(JSON.stringify({ guard_id: (g as any).data.id }), { headers: cors });
});
