// supabase/functions/uploads/index.ts
// Secure base64 upload (avatars, licenses, vehicles). Returns public/signed URL.
// Uses same import aliases (serve, supabase) as other functions for consistency.
import { serve } from 'std/http/server.ts';
import { preflight } from '../_shared/http.ts';
import { createClient } from '@supabase/supabase-js';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
};

serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: cors,
    });
  }

  try {
    const { bucket, path, base64, contentType } = await req.json();
    if (!bucket || !path || !base64) {
      return new Response(JSON.stringify({ error: 'Missing params' }), {
        status: 400,
        headers: cors,
      });
    }
    const url = Deno.env.get('BLINDADO_SUPABASE_URL')!;
    const key = Deno.env.get('BLINDADO_SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(url, key);

    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const { error } = await supabase.storage.from(bucket).upload(path, bytes, {
      contentType: contentType || 'application/octet-stream',
      upsert: true,
    });
    if (error) throw error;

    // For avatars, return public URL; for private buckets return signed url 1 hour
    let publicUrl: string | null = null;
    if (bucket === 'avatars') {
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      publicUrl = data.publicUrl;
    } else {
      const { data, error: e2 } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
      if (e2) throw e2;
      publicUrl = data.signedUrl;
    }

    return new Response(JSON.stringify({ ok: true, url: publicUrl, bucket, path }), {
      headers: cors,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: cors,
    });
  }
});
