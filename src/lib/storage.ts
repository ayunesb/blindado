import type { SupabaseClient } from '@supabase/supabase-js';

export async function uploadPrivate(
  sb: SupabaseClient,
  bucket: string,
  path: string,
  file: File,
) {
  const { data, error } = await sb.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: true,
  });
  if (error) throw error;
  return data;
}

export async function getSignedUrl(sb: SupabaseClient, bucket: string, path: string, seconds = 3600) {
  const { data, error } = await sb.storage.from(bucket).createSignedUrl(path, seconds);
  if (error) throw error;
  return data.signedUrl;
}
