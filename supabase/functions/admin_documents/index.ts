// supabase/functions/admin_documents/index.ts
// Admin-only signed upload URL endpoint
// Admin uploads: two modes
// (A) JSON -> returns signed upload URL you can PUT bytes to
//     POST { bucket, path, contentType? }  -> { ok, method: "PUT", signedUrl, headers, path }
// (B) multipart/form-data -> directly uploads a file and returns public_url (for avatars)
//     fields: profile_id? (to set profiles.photo_url), bucket? (defaults: "avatars"), file

import { serve } from 'std/http/server.ts';
import { preflight } from '../_shared/http.ts';
import { createClient } from '@supabase/supabase-js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-admin-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

function env(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`missing ${name}`);
  return v;
}

serve(async (req) => {
  try {
  const pf = preflight(req);
  if (pf) return pf;
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
        status: 405,
        headers: CORS,
      });
    }

    const adminHeader = req.headers.get('x-admin-secret') ?? '';
    const ADMIN = env('ADMIN_API_SECRET');
    if (adminHeader !== ADMIN) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: CORS,
      });
    }

    const supabase = createClient(
      env('BLINDADO_SUPABASE_URL'),
      env('BLINDADO_SUPABASE_SERVICE_ROLE_KEY'),
    );

    const ct = req.headers.get('content-type') || '';

    // (A) JSON: create a signed upload URL
    if (ct.includes('application/json')) {
      const { bucket, path, contentType } = await req.json();
      if (!bucket || !path) {
        return new Response(JSON.stringify({ error: 'bucket_and_path_required' }), {
          status: 400,
          headers: CORS,
        });
      }
      const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path);
      if (error || !data) {
        return new Response(JSON.stringify({ error: error?.message || 'signed_url_failed' }), {
          status: 500,
          headers: CORS,
        });
      }
      return new Response(
        JSON.stringify({
          ok: true,
          method: 'PUT',
          signedUrl: data.signedUrl,
          path,
          headers: {
            'x-upsert': 'true',
            'content-type': contentType || 'application/octet-stream',
          },
        }),
        { status: 200, headers: CORS },
      );
    }

    // (B) multipart: direct upload (good for avatars)
    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) {
      return new Response(JSON.stringify({ error: 'file_required' }), {
        status: 400,
        headers: CORS,
      });
    }
    const bucket = (form.get('bucket') as string) || 'avatars';
    const profile_id = (form.get('profile_id') as string) || '';
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${profile_id || 'misc'}/${Date.now()}.${ext}`;

    const bytes = new Uint8Array(await file.arrayBuffer());
    const up = await supabase.storage.from(bucket).upload(path, bytes, {
      contentType: file.type || 'application/octet-stream',
      upsert: true,
    });
    if (up.error) {
      return new Response(JSON.stringify({ error: up.error.message }), {
        status: 500,
        headers: CORS,
      });
    }

    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
    if (profile_id && bucket === 'avatars') {
      await supabase.from('profiles').update({ photo_url: pub.publicUrl }).eq('id', profile_id);
    }

    return new Response(JSON.stringify({ ok: true, bucket, path, public_url: pub.publicUrl }), {
      status: 200,
      headers: CORS,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg.includes('missing ') ? 500 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: CORS,
    });
  }
});
