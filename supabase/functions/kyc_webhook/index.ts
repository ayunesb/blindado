// supabase/functions/kyc_webhook/index.ts
// Simple authenticated webhook to update profiles.kyc_status
import { serve } from "serve";
import { createClient } from "supabase";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

serve(async (req) => {
  if(req.method === 'OPTIONS') return new Response(null,{ status:204, headers:cors });
  if(req.method !== 'POST') return new Response(JSON.stringify({ error:'POST only'}),{ status:405, headers:cors });

  const secret = Deno.env.get('KYC_WEBHOOK_SECRET');
  if(!secret) return new Response(JSON.stringify({ error:'secret not set'}),{ status:500, headers:cors });
  if(req.headers.get('x-kyc-secret') !== secret) return new Response(JSON.stringify({ error:'unauthorized'}),{ status:401, headers:cors });

  try {
    const { profile_id, status } = await req.json();
    if(!profile_id || !['pending','verified','rejected'].includes(status)) return new Response(JSON.stringify({ error:'profile_id + status required'}),{ status:400, headers:cors });

    const supa = createClient(
      Deno.env.get('BLINDADO_SUPABASE_URL')!,
      Deno.env.get('BLINDADO_SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { error } = await supa.from('profiles').update({ kyc_status: status }).eq('id', profile_id);
    if(error) return new Response(JSON.stringify({ error:error.message }),{ status:500, headers:cors });

    return new Response(JSON.stringify({ ok:true }),{ headers:cors });
  } catch(err:any){
    return new Response(JSON.stringify({ error: err?.message || String(err) }), { status:500, headers:cors });
  }
});
