// src/client/lib/auth.ts
import { getSupabaseClient } from './supabase';

export type UiRole = 'client' | 'company' | 'freelancer' | 'admin';

// Maps DB role names to UI roles without changing DB constraints (guard -> freelancer)
function dbRoleToUi(role?: string | null): UiRole | undefined {
  if (!role) return undefined;
  if (role === 'guard') return 'freelancer';
  if (role === 'company_admin' || role === 'company') return 'company';
  if (role === 'client' || role === 'admin') return role as UiRole;
  return undefined;
}

export async function getSessionRole(): Promise<{ userId?: string; role?: UiRole }> {
  const supabase = getSupabaseClient();
  const { data: u } = await supabase.auth.getUser();
  const user = u?.user;
  if (!user) return {};
  // Try both schemas: profiles.user_id and profiles.id
  let role: string | undefined;
  const byUserId = await supabase.from('profiles').select('role').eq('user_id', user.id).maybeSingle<{ role?: string }>();
  role = byUserId.data?.role ?? undefined;
  if (!role) {
    const byId = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle<{ role?: string }>();
    role = byId.data?.role ?? undefined;
  }
  return { userId: user.id, role: dbRoleToUi(role) };
}
