// src/client/lib/supabase.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;
export function getSupabaseClient(): SupabaseClient {
  if (cached) return cached;
  const params = new URLSearchParams(window.location.search);
  const url = params.get('sb') || (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const anon = params.get('anon') || (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';
  if (!url || !anon) {
    throw new Error('Missing Supabase URL or anon key. Provide ?sb=&anon= in URL or set VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY.');
  }
  cached = createClient(url, anon, {
    auth: { persistSession: true, storageKey: 'blindado.auth' },
    global: { headers: { 'x-client-info': 'blindado-web' } },
  });
  return cached;
}
