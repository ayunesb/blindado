import type { SupabaseClient } from '@supabase/supabase-js';

export type Role = 'client' | 'company' | 'guard';

export async function submitOnboarding(
  supabase: SupabaseClient,
  role: Role,
  data: Record<string, unknown>,
  opts?: { stub?: boolean }
) {
  type ImportMetaEnv = { env?: Record<string, string | undefined> };
  const env = (import.meta as unknown as ImportMetaEnv).env;
  const stub =
    opts?.stub ||
    (typeof window !== 'undefined' &&
      (new URLSearchParams(location.search).has('stub') || env?.VITE_STUB_API === '1'));
  if (stub) {
    await new Promise((r) => setTimeout(r, 250));
    return { ok: true } as const;
  }

  const fn = role === 'client' ? 'client_profile_upsert'
    : role === 'company' ? 'company_upsert'
    : 'freelancer_apply';

  const { data: res, error } = await supabase.functions.invoke(fn, {
    body: data,
  });
  if (error) throw error;
  return res as unknown;
}
