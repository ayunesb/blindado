// supabase/functions/admin_licenses/index.ts
// Simple admin endpoint to verify / reject licenses
import { serve } from "serve";
import { createClient } from "supabase";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json"
};
const j = (b: unknown, s=200)=> new Response(JSON.stringify(b), { status:s, headers:cors });

serve(async (req)=>{
  if(req.method === 'OPTIONS') return new Response(null,{status:204, headers:cors});

  const supa = createClient(
    Deno.env.get('BLINDADO_SUPABASE_URL')!,
    Deno.env.get('BLINDADO_SUPABASE_SERVICE_ROLE_KEY')!
  );

  const url = new URL(req.url);
  const path = url.pathname.split('/').pop() || '';

  if(req.method === 'POST' && path === 'set_status'){
    const { license_id, status } = await req.json().catch(()=>({}));
    if(!license_id || !['valid','rejected'].includes(status)) return j({ error:'license_id + status(valid|rejected) required'},400);
    const { error } = await supa.from('licenses').update({ status }).eq('id', license_id);
    if(error) return j({ error: error.message },500);
    return j({ ok:true });
  }

  if(req.method === 'GET' && path === 'list'){
    const { data, error } = await supa.from('licenses').select('id, guard_id, type, number, status, files').order('created_at',{ ascending:false }).limit(50);
    if(error) return j({ error:error.message },500);
    return j({ licenses:data });
  }

  return j({ error:'not found' },404);
});
